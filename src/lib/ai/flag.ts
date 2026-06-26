/**
 * Client AI feature flag (PRD-phase-2 §3.6, Principle P1 "additive, never
 * load-bearing").
 *
 * When this is false — the default, and anything other than the exact string
 * "true" — AlphaBrilliant behaves byte-for-byte like the Phase 1 MVP:
 * hand-written hints / feedback, the fixed lesson path, zero AI, and zero
 * network calls to our AI callables. Every wrapper in `src/lib/ai/client.ts`
 * early-returns a safe empty result when this is false, so no AI path can run.
 */
export const aiEnabled = () => import.meta.env.VITE_AI_ENABLED === "true";
