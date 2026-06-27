/**
 * POST /api/generate — Pillar B (PRD §4.2): verified, schema-valid practice.
 *
 * Ported from `functions/src/handlers/generate.ts` (Firebase callable → Vercel
 * Node serverless). The generation + verification firewall is preserved exactly:
 * the model proposes a scenario via strict structured output → we compute the
 * answer key (`mathjs` + engine) and assemble a `ProblemStep` → it must pass the
 * verification firewall before we return it. Discard & regenerate on failure,
 * with a deterministic hand-built fallback so the learner never hits a dead-end.
 *
 * Contract (matches src/lib/ai/client.ts): 200 JSON `{ step: ProblemStep | null }`.
 *
 * OpenAI endpoint (verified against openai@6.45.0):
 *   POST /v1/responses with `text.format = { type:"json_schema", strict:true }`
 *   ⇢ client.responses.create()  (Structured Outputs)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getOpenAI, MODELS } from "./_lib/openai.js";
import { guardPost, readJsonBody } from "./_lib/http.js";
import type { ProblemStep, TriangleSide } from "./_lib/content/types.js";
import {
  GENERABLE_KINDS,
  type Difficulty,
  type GenerableKind,
  assemble,
  buildFallback,
  genInput,
  GEN_SYSTEM,
  mulberry32,
  parseProposal,
  proposalSchema,
  verify,
} from "./_lib/generation.js";

/** How many model proposals to try before falling back to the template bank. */
const MAX_ATTEMPTS = 3;

export interface GenerateProblemRequest {
  /** Which verifiable interaction kind to generate. */
  interactionKind: GenerableKind;
  /** Target difficulty (drives leg-length range). Defaults to "medium". */
  difficulty?: Difficulty;
  /** Optional seed for deterministic server-side choices (testing/repro). */
  seed?: number;
}

export interface GenerateProblemResponse {
  /** The verified, render-ready problem, tagged `source:"ai"`. */
  step: ProblemStep;
}

/**
 * Bound the untrusted request (defence-in-depth, PRD §3.6). Enforces the same
 * known-kind gate as the Cloud Function's `isGenerableKind` check.
 */
const generateSchema = z.object({
  interactionKind: z.enum(GENERABLE_KINDS),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  seed: z.number().optional(),
});

/**
 * Core generation logic (thin HTTP wrapper below). Returns a verified,
 * render-ready `ProblemStep` — never an unverified one (P4).
 */
async function generateProblem(
  data: GenerateProblemRequest,
): Promise<GenerateProblemResponse> {
  const kind = data.interactionKind;
  const difficulty: Difficulty = data.difficulty ?? "medium";
  const seed = data.seed ?? Date.now();
  const rng = mulberry32(seed);
  // Server owns the target side for pick-side (the answer key, never the model's).
  const targetSide: TriangleSide = (["a", "b", "c"] as const)[Math.floor(rng() * 3)] ?? "c";

  const client = getOpenAI();
  const schema = proposalSchema(kind);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await client.responses.create({
        model: MODELS.text,
        instructions: GEN_SYSTEM,
        input: genInput(kind, difficulty, targetSide),
        max_output_tokens: 800,
        text: {
          format: {
            type: "json_schema",
            name: `problem_${kind}`,
            schema,
            strict: true,
          },
        },
      });

      const raw: unknown = JSON.parse(response.output_text ?? "{}");
      const proposal = parseProposal(kind, raw);
      const step = assemble(proposal, { kind, difficulty, targetSide, rng });

      if (verify(step)) {
        return { step };
      }
    } catch (err) {
      // Parse / validation / assembly error: count it and try again.
      console.warn(`generateProblem attempt ${attempt} failed (kind=${kind})`, err);
    }
  }

  // All model attempts failed verification → deterministic, pre-verified fallback.
  const step = buildFallback(kind, difficulty, seed);
  return { step };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const uid = await guardPost(req, res);
  if (uid === null) return;

  const parsed = generateSchema.safeParse(readJsonBody(req));
  if (!parsed.success) {
    res.status(400).json({
      error: `interactionKind must be one of: ${GENERABLE_KINDS.join(", ")}`,
    });
    return;
  }

  try {
    const result = await generateProblem(parsed.data);
    res.status(200).json(result);
  } catch (err) {
    console.error("generateProblem failed", err);
    res.status(500).json({ error: "Problem generation failed." });
  }
}
