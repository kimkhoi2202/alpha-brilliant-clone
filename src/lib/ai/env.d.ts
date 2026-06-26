/// <reference types="vite/client" />

/**
 * Strongly-type the AI flag on `import.meta.env` so `aiEnabled()` reads a
 * `string | undefined` instead of `any`. Keep this ambient (no imports/exports)
 * so it merges with Vite's global `ImportMetaEnv`.
 */
interface ImportMetaEnv {
  /** "true" enables AI; anything else (including unset) keeps Phase 1 behavior. */
  readonly VITE_AI_ENABLED?: string;
}
