/**
 * Tiny shared helper for narrowing dynamically-typed values.
 *
 * Both the callable client (server responses) and the voice tool layer (tool
 * results) treat their inputs as `unknown` and normalize them defensively, so a
 * skeleton / partially-implemented backend can't crash the client.
 */

/** Narrow an unknown value to a plain record, or null when it isn't one. */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}
