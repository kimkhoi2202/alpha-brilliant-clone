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
 * Contract — single mode (matches src/lib/ai/client.ts): request
 * `{ interactionKind }` ⇢ 200 JSON `{ step: ProblemStep }`. Batch mode: request
 * `{ kinds: GenerableKind[] }` (1..5) ⇢ 200 JSON `{ steps: ProblemStep[] }`, one
 * verified step per kind in the same order (each item runs the firewall above).
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

/** Max items in one batch request (PRD §4.2). Duplicate kinds are allowed — item `i` uses `seed + i`. */
const MAX_BATCH = 5;

/** Single-problem request: generate ONE verified step of the given kind. */
export interface GenerateProblemRequest {
  /** Which verifiable interaction kind to generate. */
  interactionKind: GenerableKind;
  /** Target difficulty (drives leg-length range). Defaults to "medium". */
  difficulty?: Difficulty;
  /** Optional seed for deterministic server-side choices (testing/repro). */
  seed?: number;
}

/** Single-problem response (back-compat with the current client). */
export interface GenerateProblemResponse {
  /** The verified, render-ready problem, tagged `source:"ai"`. */
  step: ProblemStep;
}

/** Batch request: generate one verified step per kind (1..MAX_BATCH), in order. */
export interface GenerateBatchRequest {
  /** Interaction kinds to generate; 1..MAX_BATCH entries. */
  kinds: GenerableKind[];
  /** Target difficulty applied to every item. Defaults to "medium". */
  difficulty?: Difficulty;
  /** Optional base seed; item `i` uses `seed + i` for distinct, deterministic items. */
  seed?: number;
}

/** Batch response: one verified step PER requested kind, in the SAME order. */
export interface GenerateBatchResponse {
  /** Verified, render-ready problems, one per requested kind, tagged `source:"ai"`. */
  steps: ProblemStep[];
}

/**
 * Bound the untrusted request (defence-in-depth, PRD §3.6). Accepts EXACTLY ONE
 * of two shapes: single (`interactionKind`) or batch (`kinds`, 1..MAX_BATCH).
 * Both fields are optional here; the `.refine` enforces the exclusive-or (reject
 * neither and both), while `.min(1).max(MAX_BATCH)` bounds the batch and the enum
 * keeps the same known-kind gate as the Cloud Function's `isGenerableKind` check.
 */
const generateSchema = z
  .object({
    interactionKind: z.enum(GENERABLE_KINDS).optional(),
    kinds: z.array(z.enum(GENERABLE_KINDS)).min(1).max(MAX_BATCH).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    seed: z.number().optional(),
  })
  // Exactly one mode: interactionKind XOR kinds.
  .refine((d) => (d.interactionKind === undefined) !== (d.kinds === undefined));

/** Shared 400 body for any request that isn't a valid single- or batch-mode call. */
const BAD_REQUEST =
  `Provide exactly one of interactionKind or kinds (1–${MAX_BATCH}); ` +
  `each kind must be one of: ${GENERABLE_KINDS.join(", ")}`;

/**
 * Reasoning effort for problem generation. gpt-5.5 is a reasoning model and
 * "xhigh" is its top tier (none/minimal/low/medium/high/xhigh), so it thinks
 * hardest about a well-formed, well-phrased problem. The deterministic firewall
 * still verifies correctness regardless; generation is batched and cached, so the
 * extra latency hides behind the prefetch.
 */
const GEN_REASONING_EFFORT = "xhigh" as const;

/**
 * Output-token ceiling. Reasoning tokens count against this alongside the JSON
 * output, so at "xhigh" a tight cap (the old 800) gets spent on reasoning and
 * truncates the JSON, forcing the fallback every time. The JSON payload itself is
 * tiny, so this is mostly reasoning headroom.
 */
const GEN_MAX_OUTPUT_TOKENS = 6000;

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
        max_output_tokens: GEN_MAX_OUTPUT_TOKENS,
        reasoning: { effort: GEN_REASONING_EFFORT },
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

/**
 * Batch core: generate one verified step PER requested kind, IN PARALLEL.
 * Each kind gets a distinct seed (`baseSeed + i`) so the items differ yet keep
 * server-side choices deterministic when a `seed` is supplied (model-authored text
 * is not seeded). The per-kind core already falls back to
 * a pre-verified template on model failure, so a single slow/failed kind can never
 * fail the whole batch — we always resolve exactly `kinds.length` verified steps,
 * in the same order as `kinds`.
 */
async function generateBatch(
  data: GenerateBatchRequest,
): Promise<GenerateBatchResponse> {
  const baseSeed = data.seed ?? Date.now();
  const steps = await Promise.all(
    data.kinds.map(async (kind, i) => {
      const { step } = await generateProblem({
        interactionKind: kind,
        difficulty: data.difficulty,
        seed: baseSeed + i,
      });
      return step;
    }),
  );
  return { steps };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const uid = await guardPost(req, res);
  if (uid === null) return;

  const parsed = generateSchema.safeParse(readJsonBody(req));
  if (!parsed.success) {
    res.status(400).json({ error: BAD_REQUEST });
    return;
  }

  // The schema guarantees exactly one mode; dispatch on which field is present.
  const { interactionKind, kinds, difficulty, seed } = parsed.data;
  try {
    let result: GenerateProblemResponse | GenerateBatchResponse;
    if (kinds !== undefined) {
      result = await generateBatch({ kinds, difficulty, seed });
    } else if (interactionKind !== undefined) {
      result = await generateProblem({ interactionKind, difficulty, seed });
    } else {
      // Unreachable: the schema's refine rejects "neither mode" with a 400 above.
      res.status(400).json({ error: BAD_REQUEST });
      return;
    }
    res.status(200).json(result);
  } catch (err) {
    console.error("generate handler failed", err);
    res.status(500).json({ error: "Problem generation failed." });
  }
}
