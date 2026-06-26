/**
 * `generateProblem` — Pillar B (PRD §4.2): verified, schema-valid practice.
 *
 * Flow: model proposes a scenario via strict structured output → we compute the
 * answer key (`mathjs` + engine) and assemble a `ProblemStep` → the verification
 * firewall must pass before we return it. Discard & regenerate on failure, with
 * a deterministic hand-built fallback so the learner never hits a dead-end.
 *
 * OpenAI endpoint (verified against openai@6.45.0):
 *   POST /v1/responses with `text.format = { type:"json_schema", strict:true }`
 *   ⇢ client.responses.create()  (Structured Outputs)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { OPENAI_API_KEY } from "../shared/secrets.js";
import { makeOpenAI, MODELS } from "../shared/openai.js";
import { requireUid } from "../shared/auth.js";
import { trackUsage } from "../shared/usage.js";
import type { ProblemStep, TriangleSide } from "../content/types.js";
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
} from "../shared/generation.js";

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
  /** Kind generated (echo). */
  kind: GenerableKind;
  /** Difficulty used (echo). */
  difficulty: Difficulty;
  /** Number of model attempts made (1..MAX_ATTEMPTS). */
  attempts: number;
  /** True if the deterministic fallback bank produced the problem. */
  usedFallback: boolean;
}

function isGenerableKind(value: unknown): value is GenerableKind {
  return typeof value === "string" && (GENERABLE_KINDS as readonly string[]).includes(value);
}

export const generateProblem = onCall<GenerateProblemRequest>(
  { secrets: [OPENAI_API_KEY] },
  async (request): Promise<GenerateProblemResponse> => {
    const uid = requireUid(request);
    const data = request.data;

    if (!isGenerableKind(data?.interactionKind)) {
      throw new HttpsError(
        "invalid-argument",
        `interactionKind must be one of: ${GENERABLE_KINDS.join(", ")}`,
      );
    }
    const kind = data.interactionKind;
    const difficulty: Difficulty = data.difficulty ?? "medium";
    const seed = data.seed ?? Date.now();
    const rng = mulberry32(seed);
    // Server owns the target side for pick-side (the answer key, never the model's).
    const targetSide: TriangleSide = (["a", "b", "c"] as const)[Math.floor(rng() * 3)] ?? "c";

    const client = makeOpenAI(OPENAI_API_KEY.value());
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
          await trackUsage(uid, "problemsGenerated");
          return { step, kind, difficulty, attempts: attempt, usedFallback: false };
        }
        await trackUsage(uid, "problemsRejected");
      } catch (err) {
        // Parse / validation / assembly error: count it and try again.
        console.warn(`generateProblem attempt ${attempt} failed (kind=${kind})`, err);
        await trackUsage(uid, "problemsRejected");
      }
    }

    // All model attempts failed verification → deterministic, pre-verified fallback.
    const step = buildFallback(kind, difficulty, seed);
    await trackUsage(uid, "problemsGenerated");
    return { step, kind, difficulty, attempts: MAX_ATTEMPTS, usedFallback: true };
  },
);
