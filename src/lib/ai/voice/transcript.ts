/**
 * Live-transcript projection (PRD-phase-2 §4.1 "shows a live transcript").
 *
 * Pure helpers that turn the SDK's `RealtimeItem[]` history into the small,
 * UI-friendly shape the mic panel renders. The `RealtimeSession` emits its full
 * history on every `history_updated`, including in-progress items, so projecting
 * it here keeps the component dumb and keeps all SDK-shape knowledge in one place.
 *
 * Only spoken/written conversation turns (user + assistant `message` items) are
 * surfaced; tool-call and MCP items are intentionally dropped from the visible
 * transcript.
 */
import type { RealtimeItem, RealtimeMessageItem } from "@openai/agents-realtime";

export type VoiceRole = "user" | "assistant";

/** One conversation turn, ready to render. */
export interface VoiceTranscriptEntry {
  /** Stable item id (React key). */
  id: string;
  /** Who spoke. */
  role: VoiceRole;
  /** Spoken/written text (audio turns use their transcript). */
  text: string;
  /** Still streaming — drives the "…" in-progress cue. */
  inProgress: boolean;
}

/** Concatenate a message item's text + audio-transcript parts into one string. */
function messageText(item: RealtimeMessageItem): string {
  let out = "";
  for (const part of item.content) {
    if ("text" in part && typeof part.text === "string") {
      out += part.text;
    } else if ("transcript" in part && typeof part.transcript === "string") {
      out += part.transcript;
    }
  }
  return out.trim();
}

/** Project the session history into renderable user/assistant turns. */
export function toTranscript(
  items: readonly RealtimeItem[],
): VoiceTranscriptEntry[] {
  const entries: VoiceTranscriptEntry[] = [];
  for (const item of items) {
    if (item.type !== "message") continue;
    if (item.role !== "user" && item.role !== "assistant") continue;
    entries.push({
      id: item.itemId,
      role: item.role,
      text: messageText(item),
      inProgress: item.status === "in_progress",
    });
  }
  return entries;
}

/**
 * Whether the learner has produced any transcribed speech yet — the signal that
 * unlocks the reveal effort-gate's "talked to Koji" path (§2.3). True only once a
 * user turn carries non-empty text, so merely connecting doesn't count.
 */
export function hasUserSpoken(items: readonly RealtimeItem[]): boolean {
  return items.some(
    (item) =>
      item.type === "message" &&
      item.role === "user" &&
      messageText(item).length > 0,
  );
}
