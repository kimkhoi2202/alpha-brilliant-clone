/**
 * POST /api/generate — Pillar B (PRD §4.2): MODEL-AUTHORED practice.
 *
 * Owner-approved reversal of the previous "verification firewall" for the
 * generation path: the model now authors the COMPLETE, render-ready problem and
 * OWNS its correctness (all constraints live in the prompt). The server no
 * longer picks triples or derives an answer key. It only validates that the
 * model output PARSES into a renderable interaction shape (crash-prevention) and
 * wraps it into a `ProblemStep`; on unparseable/unrenderable output it retries,
 * then falls back to a deterministic hand-built problem so the learner never
 * hits a dead-end.
 *
 * Contract — single mode (matches src/lib/ai/client.ts): request
 * `{ interactionKind }` ⇢ 200 JSON `{ step: ProblemStep }`. Batch mode: request
 * `{ kinds: GenerableKind[] }` (1..5) ⇢ 200 JSON `{ steps: ProblemStep[] }`, one
 * step per kind in the same order (the batch spans varied kinds for variety).
 *
 * OpenAI endpoint (verified against openai@6.45.0):
 *   POST /v1/responses with `text.format = { type:"json_schema", strict:true }`
 *   ⇢ client.responses.create()  (Structured Outputs)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getOpenAI, MODELS } from "./_lib/openai.js";
import { guardPost, readJsonBody } from "./_lib/http.js";
import type { ProblemStep } from "./_lib/content/types.js";
import {
  GENERABLE_KINDS,
  type Difficulty,
  type GenerableKind,
  assemble,
  buildFallback,
  genInput,
  GEN_SYSTEM,
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
  /** The render-ready, model-authored problem, tagged `source:"ai"`. */
  step: ProblemStep;
}

/** Batch request: generate one step per kind (1..MAX_BATCH), in order. */
export interface GenerateBatchRequest {
  /** Interaction kinds to generate; 1..MAX_BATCH entries. */
  kinds: GenerableKind[];
  /** Target difficulty applied to every item. Defaults to "medium". */
  difficulty?: Difficulty;
  /** Optional base seed; item `i` uses `seed + i` for distinct, deterministic items. */
  seed?: number;
}

/** Batch response: one step PER requested kind, in the SAME order. */
export interface GenerateBatchResponse {
  /** Render-ready, model-authored problems, one per requested kind, tagged `source:"ai"`. */
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
 * hardest about authoring a correct, well-formed, well-phrased problem — which
 * matters more now that the model OWNS correctness. Generation is batched and
 * cached, so the extra latency hides behind the prefetch.
 */
const GEN_REASONING_EFFORT = "xhigh" as const;

/**
 * Output-token ceiling. Reasoning tokens count against this alongside the JSON
 * output, so at "xhigh" a tight cap gets spent on reasoning and truncates the
 * JSON, forcing the fallback. The model now emits the FULL problem (interaction
 * + choices/tiles/template + figure), a larger payload than the old a/b proposal,
 * so this is raised to leave ample room for reasoning AND the bigger JSON.
 */
const GEN_MAX_OUTPUT_TOKENS = 8000;

/**
 * Core generation logic (thin HTTP wrapper below). Returns a render-ready
 * `ProblemStep` — model-authored when usable, else the deterministic fallback.
 */
async function generateProblem(
  data: GenerateProblemRequest,
): Promise<GenerateProblemResponse> {
  const kind = data.interactionKind;
  const difficulty: Difficulty = data.difficulty ?? "medium";
  const seed = data.seed ?? Date.now();

  const client = getOpenAI();
  const schema = proposalSchema(kind);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await client.responses.create({
        model: MODELS.text,
        instructions: GEN_SYSTEM,
        input: genInput(kind, difficulty, seed),
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

      // The model authors the FULL problem; we only validate it parses into a
      // renderable shape (crash-prevention) and wrap it — no answer re-derivation.
      const raw: unknown = JSON.parse(response.output_text ?? "{}");
      const proposal = parseProposal(kind, raw);
      const step = assemble(proposal);

      if (verify(step)) {
        return { step };
      }
    } catch (err) {
      // Parse / shape / assembly error: count it and try again.
      console.warn(`generateProblem attempt ${attempt} failed (kind=${kind})`, err);
    }
  }

  // Model output unusable across all attempts → deterministic, renderable fallback.
  const step = buildFallback(kind, difficulty, seed);
  return { step };
}

/**
 * Batch core: generate one step PER requested kind, IN PARALLEL. Each kind gets
 * a distinct seed (`baseSeed + i`), used only by the deterministic fallback
 * (model-authored content is not seeded). The per-kind core always resolves a
 * renderable step — model-authored when usable, else the hand-built fallback —
 * so a single slow/failed kind can never fail the whole batch; we always resolve
 * exactly `kinds.length` steps, in the same order as `kinds`.
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
