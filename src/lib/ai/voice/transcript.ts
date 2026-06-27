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
  /**
   * Present only on special "answer" bubbles woven into the rendered thread from
   * persisted history (a Check submission). They never come from the realtime
   * session, so live/spoken/typed turns leave this undefined. The renderer keys
   * off it to draw the distinct yellow ✓/✗ bubble; `correct`/`stepIndex` drive
   * the status glyph and the click-to-step navigation, and `ts` carries the
   * persisted timestamp so persistence round-trips without re-stamping it.
   */
  kind?: "answer";
  /** Answer bubbles: whether the submitted answer graded correct. */
  correct?: boolean;
  /** Answer bubbles: the step index to jump back to on click. */
  stepIndex?: number;
  /** Answer bubbles: the persisted epoch-ms (preserved through persistence). */
  ts?: number;
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
 * Collapse runs of CONSECUTIVE assistant turns that carry the SAME non-empty
 * text down to a single bubble — the last line of defense against the realtime
 * model emitting its final answer more than once in one turn.
 *
 * The duplicate `final_answer` items the model/SDK can produce arrive as
 * separate `assistant` message items with DIFFERENT ids but byte-identical text,
 * so the id-based merge dedupe in `VoiceControls` (which catches re-echoed and
 * optimistic turns by id) can't see them. This pass runs AFTER that merge and
 * keeps only the FIRST of each identical, back-to-back assistant run — handling
 * 2+ copies in a row — so one user message yields exactly one rendered reply no
 * matter how many copies the model emits.
 *
 * Deliberately narrow so it can never hide real content:
 *  - only ASSISTANT turns are ever folded; user turns pass through untouched (so
 *    the optimistic-user dedupe-by-id upstream stays fully intact),
 *  - turns are compared by TRIMMED text and folded only when it is non-empty and
 *    EXACTLY equal, so distinct replies — and an empty in-progress placeholder —
 *    are always kept,
 *  - only IMMEDIATELY-adjacent assistant turns merge: two identical replies that
 *    are separated by a user turn are two genuine turns and stay separate.
 */
export function collapseConsecutiveAssistant(
  entries: readonly VoiceTranscriptEntry[],
): VoiceTranscriptEntry[] {
  const out: VoiceTranscriptEntry[] = [];
  for (const entry of entries) {
    const prev = out[out.length - 1];
    if (entry.role === "assistant" && prev?.role === "assistant") {
      const text = entry.text.trim();
      if (text.length > 0 && text === prev.text.trim()) {
        // Same answer re-emitted back-to-back — fold it into the one we kept.
        continue;
      }
    }
    out.push(entry);
  }
  return out;
}

/**
 * Whether the learner has produced any transcribed speech yet — the signal that
 * unlocks the reveal effort-gate's "talked to Koji" path (§2.3). True only once a
 * user turn carries non-empty text, so merely connecting doesn't count.
 *
 * `ignoreIds` excludes turns that were *seeded* into the session as prior
 * conversation context (see `toRealtimeHistory`): a restored transcript can carry
 * old user turns, but resuming a conversation must NOT auto-unlock reveal on a
 * fresh step — only genuinely new speech this session counts.
 */
export function hasUserSpoken(
  items: readonly RealtimeItem[],
  ignoreIds?: ReadonlySet<string>,
): boolean {
  return items.some(
    (item) =>
      item.type === "message" &&
      item.role === "user" &&
      !ignoreIds?.has(item.itemId) &&
      messageText(item).length > 0,
  );
}

/**
 * Build a seedable `RealtimeItem[]` from a saved conversation so a fresh realtime
 * session can be primed with prior turns as context. Passed to
 * `RealtimeSession.updateHistory` (via `KojiVoiceSession`), which diffs it against
 * the (empty, post-connect) history and emits a `conversation.item.create` per
 * turn — giving Koji the earlier exchange before the learner's next word.
 *
 * Each item KEEPS the stored message id as its `itemId` (the Realtime API
 * preserves client-provided ids and echoes them back), so the on-screen merge can
 * dedupe seeded echoes against the restored turns by id.
 */
export function toRealtimeHistory(
  messages: readonly { id: string; role: VoiceRole; text: string }[],
): RealtimeItem[] {
  const items: RealtimeItem[] = [];
  for (const message of messages) {
    const text = message.text.trim();
    if (!text) continue;
    if (message.role === "user") {
      items.push({
        itemId: message.id,
        type: "message",
        role: "user",
        status: "completed",
        content: [{ type: "input_text", text }],
      });
    } else {
      items.push({
        itemId: message.id,
        type: "message",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text }],
      });
    }
  }
  return items;
}
