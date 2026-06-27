/**
 * `KojiChatSession` — the CLIENT-DRIVEN tool loop for the gpt-5.5 chat backend
 * (flag-gated by `CHAT_BACKEND === "responses"`).
 *
 * gpt-5.5 is the flagship text model but is NOT realtime-capable, so the chat
 * can't ride the WebRTC realtime session. And every Koji tool is a CLIENT-SIDE
 * effect (canvas highlight/label/point, readState, navigation, prefill, reveal,
 * celebrate), so we can't use a server-side agent runner either. This session is
 * the bridge: it keeps the conversation `items[]` locally and, per turn, runs a
 * loop against the stateless `/api/chat` endpoint —
 *
 *   1. POST `{ instructions, items, tools }`; stream Koji's text into the
 *      in-progress assistant transcript entry and collect his function calls.
 *   2. If there are no calls, that text is his final reply — finalize + stop.
 *   3. Otherwise EXECUTE each call CLIENT-SIDE via the existing `appTools`
 *      handler against the live `ToolContext` (reusing `summarizeToolResult` +
 *      the hint-leak guard, and mirroring a granted reveal into the host UI),
 *      append the id-paired `function_call` + `function_call_output` to `items`,
 *      and loop (capped at {@link MAX_HOPS}).
 *
 * It is framework-agnostic (no React): it owns `items[]` + the rendered
 * transcript and publishes an immutable {@link ChatSnapshot} via `onChange`, so a
 * hook can mirror it into state — the same split the voice `KojiVoiceSession` uses.
 * An `AbortController` per turn powers barge-in (a new send cancels an in-flight
 * reply) and teardown. Errors are never silent: a failed turn drops the empty
 * reply and bumps `turnErrorNonce`; a failed tool returns an error
 * `function_call_output` so the model can recover within the loop.
 */
import type { RealtimeItem } from "@openai/agents-realtime";

import {
  streamKojiChat,
  type ChatItem,
  type KojiChatToolCall,
} from "../client";
import type { Grounding } from "../grounding";
import { asRecord } from "../json";
import {
  appTools,
  canvasTargetsFor,
  type AnyAppTool,
  type RevealAllowed,
  type ToolContext,
} from "../tools";
import { summarizeToolResult } from "../voice/tools";
import type { VoiceTranscriptEntry } from "../voice/transcript";

/**
 * Dev-only, greppable chat logger (prefix `[koji-chat]`), mirroring the realtime
 * path's `klog`. The `import.meta.env.DEV` guard tree-shakes every call out of
 * production bundles, so none of this ships — it exists purely so the next live
 * test of the gpt-5.5 chat shows, in the console, exactly how each turn flows
 * (send → fetch → first delta → tool calls → finalize → error/reset) and where a
 * stuck turn (the "won't send again" bug) originates.
 */
export function clog(...args: unknown[]): void {
  if (import.meta.env.DEV) console.log("[koji-chat]", ...args);
}

/** First N chars of a turn's text for logs (a snippet, never the whole essay). */
function snippet(text: string, n = 60): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Hard cap on tool hops per turn, so a tool loop can never spin forever. */
const MAX_HOPS = 6;

/**
 * Tools EXCLUDED from the chat set — the hint-UI tools, mirroring the realtime
 * agent's exclusion (`HINT_UI_TOOL_NAMES` in voice/tools.ts). They produce
 * coaching TEXT for Koji to read back, which made him tool-chatty and looped him
 * into re-emitting a "final" answer; he coaches in his OWN single reply instead.
 */
const EXCLUDED_TOOL_NAMES: ReadonlySet<string> = new Set(["giveHint", "explainMiss"]);

/** The chat tool set (the shared catalog minus the hint-UI tools). */
const CHAT_APP_TOOLS: readonly AnyAppTool[] = (
  appTools as readonly AnyAppTool[]
).filter((tool) => !EXCLUDED_TOOL_NAMES.has(tool.name));

/** Tool lookup by name, for executing a model-requested call locally. */
const APP_TOOLS_BY_NAME: ReadonlyMap<string, AnyAppTool> = new Map(
  CHAT_APP_TOOLS.map((tool) => [tool.name, tool]),
);

/**
 * The tool list POSTed to the server (NAMES only). The server whitelists these
 * against its own catalog and supplies the canonical strict schemas, so this is
 * just "which whitelisted tools to enable" — the appTools catalog stays the
 * single source of truth for that set.
 */
const CHAT_TOOLS_REQUEST: { name: string }[] = CHAT_APP_TOOLS.map((tool) => ({
  name: tool.name,
}));

/** The immutable view of the chat the UI renders (mirrors `VoiceSnapshot`'s subset). */
export interface ChatSnapshot {
  /** The live conversation transcript (new turns this session). */
  transcript: VoiceTranscriptEntry[];
  /** Koji is working on a reply (streaming text or running a tool). */
  responding: boolean;
  /** Monotonic counter bumped on every non-fatal failed turn (drives the toast). */
  turnErrorNonce: number;
}

export interface KojiChatSessionOptions {
  /** Live tool-context getter — tools always run against the learner's current step. */
  getContext: () => ToolContext;
  /** Current grounding for the instructions, or null (concept step / free-form). */
  getGrounding: () => Grounding | null;
  /** Prior conversation turns to seed `items[]` with as context (read once, lazily). */
  getInitialHistory: () => RealtimeItem[];
  /** Notified with a fresh snapshot whenever anything changes. */
  onChange: (snapshot: ChatSnapshot) => void;
}

/** A fresh, collision-safe id for an assistant reply entry (distinct from user ids). */
function newAssistantId(): string {
  let body = "";
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      body = crypto.randomUUID().replace(/-/g, "");
    }
  } catch {
    // fall through to the manual scheme
  }
  if (!body) {
    body = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
  return `item_a_${body.slice(0, 22)}`;
}

/** A compact JSON error string for a failed tool call (the model can recover from it). */
function errorOutput(message: string): string {
  return JSON.stringify({ ok: false, error: message });
}

/**
 * Drop top-level `null` values so the model's strict-mode "not provided → null"
 * becomes "omitted → undefined", which the appTools' `.optional()` Zod schemas
 * accept (Zod optional allows `undefined`, not `null`). Mirrors how the realtime
 * SDK reverses its optional→nullable strict mapping before validation.
 */
function stripNulls(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val !== null) out[key] = val;
  }
  return out;
}

/**
 * Mirror a granted `revealSolution` into the lesson UI — fill the engine answer
 * and advance to "revealed" — exactly like the text panel's `applyReveal` and the
 * voice tool layer's `applyRevealToHost` (re-implemented here so the chat backend
 * stays independent of the untouched voice/tools module).
 */
function applyRevealToHost(name: string, result: unknown, ctx: ToolContext): void {
  if (name !== "revealSolution" || !ctx.onReveal) return;
  const rec = asRecord(result);
  if (rec?.allowed === true) ctx.onReveal(result as RevealAllowed);
}

/** Project seeded realtime history into Responses `items` (text messages only). */
function seedItemsFromHistory(items: readonly RealtimeItem[]): ChatItem[] {
  const out: ChatItem[] = [];
  for (const item of items) {
    if (item.type !== "message") continue;
    if (item.role !== "user" && item.role !== "assistant") continue;
    let text = "";
    for (const part of item.content) {
      if ("text" in part && typeof part.text === "string") text += part.text;
      else if ("transcript" in part && typeof part.transcript === "string") {
        text += part.transcript;
      }
    }
    text = text.trim();
    if (text) out.push({ role: item.role, content: text });
  }
  return out;
}

/** Koji's base persona + behavior contract (text-tuned mirror of the voice agent). */
const BASE_CHAT_INSTRUCTIONS = `
You are Koji, a warm, upbeat tutor inside a learn-by-doing course on the
Pythagorean theorem. You are chatting with one learner by TEXT.

Style:
- Always reply in English, even if the learner writes in another language.
- Keep replies short and conversational — usually one to three sentences.
- Be encouraging and patient. Celebrate effort, not just correct answers.
- Send exactly ONE message per turn. After you finish using tools, give that ONE
  short reply and then STOP — never repeat it or send your reply a second time.
  Don't post a separate preamble before you act (no "Sure, let me pull that up.")
  — just take the action and fold your whole reply into that single message.
- Calling a tool (reading state, highlighting, labeling, pointing, navigating,
  etc.) is a SILENT action, not a message, so it never counts as your one reply —
  use the canvas tools freely to guide the learner's eye.

How you teach — be Socratic, and SHOW, don't just say:
- Guide with questions; never hand over the answer. Activate what the learner
  already knows, then let them take the final step themselves.
- Coach from where the learner ACTUALLY is: before you hint, call readState to
  see their CURRENT answer and whether the whole thing is right yet. Reason from
  that real answer, not a guess. When the prompt itself names the goal (e.g.
  "Plot (3, 4)"), you may compare their current answer to that stated goal and
  guide them toward it, highlighting the relevant element — but never say the
  target value, and never flatly confirm which specific part is right or wrong:
  keep it a question that lets them notice it themselves.
- readState's "correct" flag is your finish line, not a hint source: only when it
  turns true has the learner truly solved it — then celebrate. While it's false,
  keep guiding Socratically toward the next move.
- Escalate your hints only as needed, phrasing each one yourself in your single reply:
  · Tier 1 — ask a guiding question or name the underlying idea (no specifics).
  · Tier 2 — narrow it to the relevant part; this is when you may highlight.
  · Tier 3 — set it up with their own numbers, but stop before the final move.
- Don't just describe the figure — drive it. Call listCanvasTargets to learn the
  part ids, then highlightElement / labelElement / pointToElement to direct the
  learner's eye, building up step by step. Use clearAnnotations to reset before
  guiding a new part. Do NOT highlight, label, or point at the ANSWER part on your
  very first hint — build up to it.
- When the learner is wrong and asks why, read their current answer with readState
  first, then name the actual mistake in your own words and nudge them toward
  fixing it themselves — give the explanation and the hint together in your one
  reply, never as two messages.
- You may prefillAnswer ONLY when the learner explicitly asks you to set it up for
  them; it fills the in-progress answer but NEVER submits — they still press Check.
  Never fill in an answer you worked out yourself.
- For more practice, use generatePractice; adjust challenge with setDifficulty. To
  move around the course, use goToLesson / resumeLesson. Check streak, XP, or
  mastery with readProgress. Celebrate wins with celebrate.

The one rule about answers:
- Never write the final numeric answer yourself, and never compute it for them.
- To reveal a worked answer, ALWAYS call revealSolution. It is effort-gated (the
  learner must have genuinely tried AND engaged you first) and the answer is
  computed by the app, so it is always correct. If it declines, relay its reason
  warmly and offer a hint instead. Only reveal when the learner explicitly asks.

Always ground what you say in the current problem state below, including the
figure parts you can point at. Do not invent numbers, facts, or part ids.
`.trim();

/** Compact, answer-free description of the current problem (mirrors the voice agent). */
function describeProblem(g: Grounding): string {
  const lines: string[] = [
    `Current problem: "${g.prompt}"`,
    `Interaction type: ${g.interactionKind}.`,
  ];

  const { triangle, choices, numeric, tiles } = g.givens;
  if (triangle) {
    const parts = [`a=${triangle.a}`, `b=${triangle.b}`];
    if (triangle.unit) parts.push(`unit=${triangle.unit}`);
    if (triangle.orientation) parts.push(`orientation=${triangle.orientation}`);
    lines.push(`Right-triangle givens: ${parts.join(", ")}.`);
  }
  if (choices && choices.length > 0) {
    lines.push(`Answer choices: ${choices.map((c) => c.label).join(" / ")}.`);
  }
  if (numeric?.unit) lines.push(`Expected answer unit: ${numeric.unit}.`);
  if (tiles) lines.push(`Tiles available: ${tiles.bank.join(", ")}.`);
  if (g.learnerAnswerText) lines.push(`Their current answer: ${g.learnerAnswerText}.`);
  lines.push(`Attempts so far on this step: ${g.attemptNumber}.`);

  const targets = canvasTargetsFor(g.interactionKind);
  if (targets.length > 0) {
    const parts = targets.map((t) => `${t.id} (${t.role})`).join(", ");
    lines.push(
      `Figure parts you can highlight/label/point at (call listCanvasTargets to confirm): ${parts}.`,
    );
  }

  return lines.join("\n");
}

/** Full instruction string: persona + (optional) grounded current-problem block. */
function buildChatInstructions(grounding: Grounding | null): string {
  if (!grounding) {
    return `${BASE_CHAT_INSTRUCTIONS}\n\nThe learner is on a concept/reading step right now, not a graded problem.`;
  }
  return `${BASE_CHAT_INSTRUCTIONS}\n\n${describeProblem(grounding)}`;
}

export class KojiChatSession {
  readonly #getContext: () => ToolContext;
  readonly #getGrounding: () => Grounding | null;
  readonly #getInitialHistory: () => RealtimeItem[];
  readonly #onChange: (snapshot: ChatSnapshot) => void;

  /** The Responses API conversation state (messages + function_call/output items). */
  #items: ChatItem[] = [];
  /** The rendered transcript (new turns this session; seeded history isn't echoed). */
  #transcript: VoiceTranscriptEntry[] = [];
  #responding = false;
  #turnErrorNonce = 0;
  /** The in-flight turn's controller, or null when idle (also the `inFlight` flag). */
  #abort: AbortController | null = null;
  #seeded = false;
  #closed = false;

  constructor(options: KojiChatSessionOptions) {
    this.#getContext = options.getContext;
    this.#getGrounding = options.getGrounding;
    this.#getInitialHistory = options.getInitialHistory;
    this.#onChange = options.onChange;
  }

  /** Whether a turn is currently in flight (used by the hook to single-flight coach). */
  get inFlight(): boolean {
    return this.#abort !== null;
  }

  /**
   * Whether this session has been torn down. The hook checks this so it NEVER
   * reuses a dead session (a closed session's `runUserTurn` no-ops, which would
   * silently swallow a send — no bubble, no fetch). See `getSession`.
   */
  get isClosed(): boolean {
    return this.#closed;
  }

  /**
   * Send the learner's typed turn and run the tool loop. Adds the user turn to the
   * transcript under the passed-in client `id` (so the optimistic on-screen bubble
   * dedupes onto it by id) and to `items[]`, then drives the reply. A turn already
   * in flight is cancelled first (barge-in).
   */
  runUserTurn(text: string, id: string): void {
    if (this.#closed) {
      // Should never happen — the hook recreates a closed session before use —
      // but log it loudly so a regression surfaces instead of silently dropping.
      clog("runUserTurn IGNORED — session closed", { id });
      return;
    }
    clog("runUserTurn", { id, text: snippet(text), inFlight: this.inFlight });
    this.#cancelInFlight();
    this.#ensureSeeded();
    this.#items.push({ role: "user", content: text });
    this.#transcript = [
      ...this.#transcript,
      { id, role: "user", text, inProgress: false },
    ];
    this.#emit();
    void this.#runLoop(false);
  }

  /**
   * Fire ONE proactive coaching turn. The instruction is appended to `items[]` as
   * a DEVELOPER-role item ONLY (never the transcript), so it's invisible and only
   * Koji's resulting reply shows. Single-flight is the caller's responsibility
   * (skip if a turn is in flight); preamble on any tool hop is discarded.
   */
  runCoachTurn(instruction: string): void {
    if (this.#closed) {
      clog("runCoachTurn IGNORED — session closed");
      return;
    }
    clog("runCoachTurn", { inFlight: this.inFlight });
    this.#ensureSeeded();
    this.#items.push({ role: "developer", content: instruction });
    void this.#runLoop(true);
  }

  /** Cancel an in-flight turn (barge-in / leaving the surface). */
  cancel(): void {
    clog("cancel", { inFlight: this.inFlight });
    this.#cancelInFlight();
  }

  /** Tear down: cancel in-flight work and stop emitting (the surface is unmounting). */
  close(): void {
    clog("close", { inFlight: this.inFlight, transcript: this.#transcript.length });
    this.#closed = true;
    this.#cancelInFlight();
  }

  // -------------------------------------------------------------------------
  // internals
  // -------------------------------------------------------------------------

  #cancelInFlight(): void {
    const controller = this.#abort;
    if (!controller) return;
    clog("cancelInFlight → abort()");
    // Reset synchronously so `inFlight` / `responding` are accurate the INSTANT we
    // cancel (not only after the aborted loop's async cleanup runs). A barge-in's
    // new turn sets them again right after; a standalone cancel leaves the session
    // idle + immediately sendable. The aborted loop's `finally` then sees it is no
    // longer the current turn (`#abort !== controller`) and won't clobber state.
    this.#abort = null;
    this.#responding = false;
    controller.abort();
  }

  #ensureSeeded(): void {
    if (this.#seeded) return;
    this.#seeded = true;
    const seeded = seedItemsFromHistory(this.#getInitialHistory());
    if (seeded.length > 0) this.#items = [...seeded, ...this.#items];
  }

  #resolveGrounding(): Grounding | null {
    try {
      return this.#getGrounding();
    } catch {
      return null;
    }
  }

  /** Run the multi-hop streaming tool loop for one turn. */
  async #runLoop(discardPreamble: boolean): Promise<void> {
    if (this.#closed) {
      clog("runLoop skipped — session closed");
      return;
    }
    const controller = new AbortController();
    this.#abort = controller;
    this.#responding = true;

    const assistantId = newAssistantId();
    this.#transcript = [
      ...this.#transcript,
      { id: assistantId, role: "assistant", text: "", inProgress: true },
    ];
    this.#emit();
    clog("runLoop start", {
      assistantId,
      discardPreamble,
      items: this.#items.length,
    });

    let toolsRan = 0;
    let lastNonEmpty = "";
    let finalText = "";
    let errored = false;
    let errorMessage = "";
    let cancelled = false;

    try {
      for (let hop = 0; hop < MAX_HOPS; hop++) {
        const instructions = buildChatInstructions(this.#resolveGrounding());
        let hopText = "";
        let firstDelta = true;
        const calls: KojiChatToolCall[] = [];
        let hopError = false;
        let hopErrorMessage = "";
        let sawDone = false;

        // Reset the visible reply for this hop, so a prior hop's preamble doesn't
        // persist alongside the final answer (the "kills preamble" guarantee).
        this.#setAssistantText(assistantId, "");
        clog("hop → POST /api/chat", { hop, items: this.#items.length });

        for await (const event of streamKojiChat(
          { instructions, items: this.#items, tools: CHAT_TOOLS_REQUEST },
          controller.signal,
        )) {
          if (event.type === "delta") {
            if (firstDelta) {
              firstDelta = false;
              clog("hop ⇐ first delta", { hop });
            }
            hopText += event.text;
            this.#setAssistantText(assistantId, hopText);
          } else if (event.type === "done") {
            calls.push(...event.calls);
            sawDone = true;
          } else {
            hopError = true;
            hopErrorMessage = event.message;
          }
        }

        if (controller.signal.aborted) {
          cancelled = true;
          clog("hop aborted (barge-in / teardown)", { hop });
          break;
        }
        // A stream that ended without a terminal `done` (a dropped connection) is a
        // failed turn, not a phantom partial reply — surface it, don't show it.
        if (hopError || !sawDone) {
          errored = true;
          errorMessage = hopErrorMessage || "stream ended without a reply";
          clog("hop failed", { hop, hopError, sawDone, message: errorMessage });
          break;
        }
        clog("hop done", { hop, calls: calls.length, textLen: hopText.length });
        if (hopText.trim()) lastNonEmpty = hopText;

        if (calls.length === 0) {
          finalText = hopText;
          break;
        }

        // Tool hop: append the assistant's function_call items, run each tool
        // client-side, and append its id-paired output for Koji's next hop.
        for (const call of calls) {
          this.#items.push({
            type: "function_call",
            call_id: call.callId,
            name: call.name,
            arguments: call.arguments,
          });
        }
        for (const call of calls) {
          toolsRan += 1;
          const output = await this.#executeTool(call);
          this.#items.push({ type: "function_call_output", call_id: call.callId, output });
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        cancelled = true;
      } else {
        errored = true;
        errorMessage = err instanceof Error ? err.message : String(err);
        clog("runLoop threw", { error: errorMessage });
      }
    } finally {
      // ALWAYS clear the in-flight/responding state for the CURRENT turn, no matter
      // how the loop exits (reply, error, cancel, or an unexpected throw). This is
      // the core "no stuck state" guarantee — the next send always starts clean. A
      // turn superseded by a barge-in (a newer turn now owns `#abort`) must NOT
      // clobber the newer turn's state, hence the `isCurrent` check.
      if (this.#abort === controller) {
        this.#abort = null;
        this.#responding = false;
      }
    }

    if (this.#closed) {
      clog("runLoop finalize skipped — session closed");
      return;
    }

    if (cancelled) {
      clog("runLoop finalize: cancelled", { assistantId });
      this.#removeEntry(assistantId);
      this.#emit();
      return;
    }
    if (errored) {
      // Never a silent death: drop the empty reply, surface the error (the UI
      // toast keys off `turnErrorNonce`), and leave the session fully sendable.
      clog("runLoop finalize: errored → turnErrorNonce++", { message: errorMessage });
      this.#removeEntry(assistantId);
      this.#turnErrorNonce += 1;
      this.#emit();
      return;
    }

    let reply = finalText.trim();
    if (!reply && !discardPreamble) reply = lastNonEmpty.trim();

    if (reply) {
      clog("runLoop finalize: reply", { len: reply.length, toolsRan });
      const finalized = reply;
      this.#transcript = this.#transcript.map((entry) =>
        entry.id === assistantId
          ? { ...entry, text: finalized, inProgress: false }
          : entry,
      );
      this.#items.push({ role: "assistant", content: finalized });
    } else {
      // A genuinely empty reply with NO tool side effects is a failed turn (toast).
      // A silent all-tool hop is a legitimate action, and a proactive coach turn is
      // best-effort, so neither bumps the counter.
      const emptyIsError = toolsRan === 0 && !discardPreamble;
      clog("runLoop finalize: empty reply", { toolsRan, emptyIsError });
      this.#removeEntry(assistantId);
      if (emptyIsError) this.#turnErrorNonce += 1;
    }
    this.#emit();
  }

  /** Execute one model-requested tool call against the live context. */
  async #executeTool(call: KojiChatToolCall): Promise<string> {
    clog("tool →", { name: call.name, args: snippet(call.arguments, 80) });
    const ctx = this.#getContext();
    const tool = APP_TOOLS_BY_NAME.get(call.name);
    if (!tool) {
      clog("tool unknown", { name: call.name });
      return errorOutput(`Unknown tool "${call.name}".`);
    }

    let raw: unknown;
    try {
      raw = call.arguments.trim() ? JSON.parse(call.arguments) : {};
    } catch {
      clog("tool args unparseable", { name: call.name });
      return errorOutput("Could not parse the tool arguments.");
    }
    const parsed = tool.parameters.safeParse(stripNulls(raw));
    if (!parsed.success) {
      clog("tool args invalid", { name: call.name });
      return errorOutput("The tool arguments were invalid.");
    }

    try {
      const result = await tool.handler(parsed.data, ctx);
      applyRevealToHost(call.name, result, ctx);
      clog("tool ✓", { name: call.name });
      return summarizeToolResult(call.name, result, ctx);
    } catch (err) {
      clog("tool threw", {
        name: call.name,
        error: err instanceof Error ? err.message : String(err),
      });
      return errorOutput("That tool couldn't run just now.");
    }
  }

  #setAssistantText(id: string, text: string): void {
    this.#transcript = this.#transcript.map((entry) =>
      entry.id === id ? { ...entry, text } : entry,
    );
    this.#emit();
  }

  #removeEntry(id: string): void {
    this.#transcript = this.#transcript.filter((entry) => entry.id !== id);
  }

  #emit(): void {
    this.#onChange({
      transcript: this.#transcript,
      responding: this.#responding,
      turnErrorNonce: this.#turnErrorNonce,
    });
  }
}
