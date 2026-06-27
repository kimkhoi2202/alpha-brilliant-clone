/**
 * Koji conversation history — Firestore persistence (PRD-phase-2 §4.1 follow-up).
 *
 * MANY conversations per LESSON, per signed-in learner. Each conversation is its
 * own doc, keyed by a generated `conversationId`, stored at:
 *
 *   users/{uid}/kojiConversations/{conversationId}
 *     {
 *       conversationId, lessonId, lessonTitle,
 *       messages: [{ id, role, text, ts }],   // chronological
 *       createdAt, createdAtMs, updatedAt, updatedAtMs
 *     }
 *
 * The "new chat" affordance archives the current conversation (it stays in
 * history) and starts a fresh one for the same lesson, so a lesson can have
 * several chats. `lessonId` is a FIELD (not the doc key) so we can find a
 * lesson's most-recent chat to resume on open.
 *
 * BACKWARD COMPATIBLE (no migration): the original model stored ONE doc per
 * lesson keyed by `lessonId` (which already carried a `lessonId` field). Those
 * docs are treated as conversations whose `conversationId === docSnap.id` (== the
 * lessonId), so they resume, list, and load cleanly alongside new generated-id
 * conversations.
 *
 * A `messages` array (not a subcollection) is intentional for v1: lesson
 * conversations are modest. We hard-cap the array (`MAX_MESSAGES`) and clamp very
 * long turns (`MAX_TEXT`) so a single doc stays comfortably under Firestore's 1MB
 * limit; if conversations ever grow unbounded, switch to a `messages`
 * subcollection.
 *
 * GUARDRAILS (match the rest of the AI surface):
 *  - AI-OFF SAFE (P1): every export no-ops / returns empty when `aiEnabled()` is
 *    false, so AI-off makes ZERO Firestore calls.
 *  - PER-USER ONLY: every path is scoped to `auth.currentUser.uid`; with no
 *    signed-in user the reads/writes are skipped entirely. (Security rules also
 *    enforce per-user access — see `firestore.rules`.)
 *  - DEGRADE GRACEFULLY (P5): any Firestore error resolves to the empty/no-op
 *    result so the panel falls back to a fresh conversation.
 *
 * Kept framework-agnostic (no React) so the persistence is testable and the
 * `useKojiConversation` hook can layer the lifecycle on top.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import { aiEnabled } from "./flag";

/** Who authored a stored turn (mirrors the voice transcript's `VoiceRole`). */
export type ConversationRole = "user" | "assistant";

/** One persisted conversation turn. */
export interface ConversationMessage {
  /** Stable id (the realtime item id, so seeding round-trips dedupe by id). */
  id: string;
  role: ConversationRole;
  text: string;
  /** Epoch-ms the turn settled (client clock; used for ordering + display). */
  ts: number;
  /**
   * Special "answer" bubbles record a Check submission (the learner's concise
   * answer) so the full record of tries persists. They are NOT realtime turns:
   * they carry `kind: "answer"` (so the UI renders a distinct yellow ✓/✗ bubble
   * and the realtime seed skips them) plus the submission's verdict + the step it
   * belongs to (so clicking the bubble can jump back to that exact step). Absent
   * on ordinary user/assistant turns. `role` stays "user" for answer bubbles (the
   * learner authored the submission), so existing role-based logic is unaffected.
   */
  kind?: "answer";
  /** Answer bubbles: whether the submitted answer graded correct (drives ✓/✗). */
  correct?: boolean;
  /** Answer bubbles: the step index the submission belongs to (drives goToStep). */
  stepIndex?: number;
}

/** A row in the history drawer (newest-first list of past conversations). */
export interface ConversationSummary {
  /** Stable per-conversation id (the Firestore doc key). */
  conversationId: string;
  lessonId: string;
  lessonTitle: string;
  /** Text of the most recent turn (for the snippet). */
  lastMessage: string;
  /** Who spoke the most recent turn, or null when empty. */
  lastRole: ConversationRole | null;
  messageCount: number;
  /** Epoch-ms of the last update (drives the relative timestamp + ordering). */
  updatedAtMs: number;
}

/** Firestore subcollection holding one doc per conversation (keyed by conversationId). */
const COLLECTION = "kojiConversations";

/** Bound the stored array so one doc stays well under Firestore's 1MB limit. */
const MAX_MESSAGES = 200;
/** Clamp a single turn so a runaway transcript can't bloat the doc. */
const MAX_TEXT = 4000;

/**
 * The active learner's uid, or null when AI is off or no one is signed in. All
 * reads/writes funnel through this so the off/signed-out paths make no FS calls.
 */
function currentUid(): string | null {
  if (!aiEnabled()) return null;
  return auth.currentUser?.uid ?? null;
}

/**
 * Generate a fresh, collision-safe conversation id. Prefers `crypto.randomUUID`
 * (available in modern browsers on secure origins / localhost); falls back to a
 * time + random scheme so we never throw on an exotic runtime. Stable once
 * generated — callers persist it as the doc key.
 */
export function newConversationId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the manual scheme
  }
  return `koji-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Defensively coerce loosely-typed Firestore data into `ConversationMessage[]`. */
function coerceMessages(raw: unknown): ConversationMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ConversationMessage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const role =
      rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
    const text = typeof rec.text === "string" ? rec.text : "";
    if (!role || !text) continue;
    const id =
      typeof rec.id === "string" && rec.id ? rec.id : `${role}-${out.length}`;
    const ts =
      typeof rec.ts === "number" && Number.isFinite(rec.ts) ? rec.ts : 0;
    const message: ConversationMessage = { id, role, text, ts };
    // Carry the special "answer" bubble metadata when present (older docs and
    // ordinary turns simply lack these fields, so they stay plain turns).
    if (rec.kind === "answer") {
      message.kind = "answer";
      if (typeof rec.correct === "boolean") message.correct = rec.correct;
      if (typeof rec.stepIndex === "number" && Number.isFinite(rec.stepIndex)) {
        message.stepIndex = rec.stepIndex;
      }
    }
    out.push(message);
  }
  return out;
}

/** Trim empties, clamp long turns, and cap the array length for storage. */
function sanitize(messages: readonly ConversationMessage[]): ConversationMessage[] {
  const clean = messages
    .filter((m) => typeof m.text === "string" && m.text.trim().length > 0)
    .map((m) => {
      const out: ConversationMessage = {
        id: m.id,
        role: m.role,
        text: m.text.length > MAX_TEXT ? m.text.slice(0, MAX_TEXT) : m.text,
        ts: Number.isFinite(m.ts) ? m.ts : Date.now(),
      };
      // Preserve answer-bubble metadata, never writing `undefined` (Firestore
      // rejects undefined fields — this client isn't configured to ignore them).
      if (m.kind === "answer") {
        out.kind = "answer";
        if (typeof m.correct === "boolean") out.correct = m.correct;
        if (typeof m.stepIndex === "number" && Number.isFinite(m.stepIndex)) {
          out.stepIndex = m.stepIndex;
        }
      }
      return out;
    });
  return clean.length > MAX_MESSAGES ? clean.slice(clean.length - MAX_MESSAGES) : clean;
}

/**
 * Load a single conversation by its id (chronological). Returns `[]` when AI is
 * off, no one is signed in, the doc doesn't exist, or on any error. Works for
 * legacy lessonId-keyed docs too (their `conversationId === docSnap.id`).
 */
export async function loadConversation(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const uid = currentUid();
  if (!uid || !conversationId) return [];
  try {
    const snap = await getDoc(doc(db, "users", uid, COLLECTION, conversationId));
    if (!snap.exists()) return [];
    return coerceMessages((snap.data() as Record<string, unknown>).messages);
  } catch {
    return [];
  }
}

/**
 * Resolve the conversation to resume for a lesson on open: the most recent
 * (by `updatedAtMs`) NON-empty conversation whose `lessonId` matches. Reuses the
 * full-collection read + a client-side filter (no extra Firestore index). Legacy
 * lessonId-keyed docs match here too (their `lessonId` field == the lessonId, and
 * `conversationId` falls back to the doc id). Returns `null` when AI is off,
 * signed out, none match, or on any error.
 */
export async function loadLatestConversationForLesson(
  lessonId: string,
): Promise<{ conversationId: string; messages: ConversationMessage[] } | null> {
  const uid = currentUid();
  if (!uid || !lessonId) return null;
  try {
    const snap = await getDocs(collection(db, "users", uid, COLLECTION));
    const matches: {
      conversationId: string;
      messages: ConversationMessage[];
      updatedAtMs: number;
    }[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const docLessonId =
        typeof data.lessonId === "string" ? data.lessonId : docSnap.id;
      if (docLessonId !== lessonId) return;
      const messages = coerceMessages(data.messages);
      if (messages.length === 0) return;
      const last = messages[messages.length - 1];
      const updatedAtMs =
        typeof data.updatedAtMs === "number" && Number.isFinite(data.updatedAtMs)
          ? data.updatedAtMs
          : last.ts;
      matches.push({ conversationId: docSnap.id, messages, updatedAtMs });
    });
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    const latest = matches[0];
    return { conversationId: latest.conversationId, messages: latest.messages };
  } catch {
    return null;
  }
}

/**
 * Upsert a conversation by its id (full-snapshot write, merged), storing the
 * owning `lessonId` as a field. No-ops when AI is off, no one is signed in, or
 * there's nothing to store. `createdAtMs` is derived from the first turn so it
 * stays stable across saves (no extra read).
 */
export async function saveConversation(
  conversationId: string,
  lessonId: string,
  lessonTitle: string,
  messages: readonly ConversationMessage[],
): Promise<void> {
  const uid = currentUid();
  if (!uid || !conversationId) return;
  const clean = sanitize(messages);
  if (clean.length === 0) return;
  try {
    const now = Date.now();
    await setDoc(
      doc(db, "users", uid, COLLECTION, conversationId),
      {
        conversationId,
        lessonId,
        lessonTitle,
        messages: clean,
        createdAtMs: clean[0]?.ts ?? now,
        updatedAtMs: now,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    // Graceful fallback (P5): a failed save just means the next open re-seeds
    // from the last successful snapshot.
  }
}

/**
 * List every saved conversation for the learner, newest-first. Empty
 * conversations are skipped. Returns `[]` when AI is off / signed out / on error.
 */
export async function listConversations(): Promise<ConversationSummary[]> {
  const uid = currentUid();
  if (!uid) return [];
  try {
    const snap = await getDocs(collection(db, "users", uid, COLLECTION));
    const out: ConversationSummary[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const messages = coerceMessages(data.messages);
      if (messages.length === 0) return;
      const last = messages[messages.length - 1];
      const updatedAtMs =
        typeof data.updatedAtMs === "number" && Number.isFinite(data.updatedAtMs)
          ? data.updatedAtMs
          : last.ts;
      out.push({
        conversationId: docSnap.id,
        lessonId: typeof data.lessonId === "string" ? data.lessonId : docSnap.id,
        lessonTitle:
          typeof data.lessonTitle === "string" && data.lessonTitle
            ? data.lessonTitle
            : docSnap.id,
        lastMessage: last.text,
        lastRole: last.role,
        messageCount: messages.length,
        updatedAtMs,
      });
    });
    out.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    return out;
  } catch {
    return [];
  }
}
