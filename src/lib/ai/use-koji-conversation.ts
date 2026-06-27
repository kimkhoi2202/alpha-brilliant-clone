/**
 * `useKojiConversation` — the lesson-scoped, durable conversation store that
 * survives the Koji panel opening/closing AND step changes (PRD-phase-2 §4.1
 * follow-up: now "many conversations per LESSON" via the panel's "new chat").
 *
 * It lives at the lesson-runner's `StepScreen` (which persists across steps and is
 * remounted per lesson), so it's the single source of truth for the current
 * lesson's transcript even though the panel's voice surface mounts/unmounts. It:
 *  - On mount, resolves the lesson's ACTIVE conversation: resume the most recent
 *    non-empty chat for the lesson, else start a fresh (empty) one. (AI-on +
 *    signed-in; AI-off makes no Firestore call.)
 *  - Tracks the ACTIVE conversation: the current lesson's by default, or a past
 *    one opened from the history drawer (free-form resume — possibly an older
 *    chat of the SAME lesson).
 *  - `startNewChat()` archives the current chat (it stays in history) and swaps in
 *    a fresh empty conversation for the same lesson.
 *  - Routes `persist` writes by conversationId and debounce-saves each
 *    conversation to its own Firestore doc (immediate `flush` on panel close).
 *
 * AI-OFF SAFE: with `aiEnabled()` false every path no-ops and no Firestore call
 * is made (the underlying module also guards). Per-user scoping is enforced in
 * `conversation-history.ts` (always `auth.currentUser.uid`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { aiEnabled } from "./flag";
import {
  loadConversation,
  loadLatestConversationForLesson,
  newConversationId,
  saveConversation,
  type ConversationMessage,
} from "./conversation-history";

/** Debounce window for growing-conversation saves (settled turns coalesce). */
const SAVE_DEBOUNCE_MS = 1200;

/** The conversation currently shown in the panel (current lesson, or a resumed past one). */
export interface ActiveKojiConversation {
  /** Stable per-conversation id (the Firestore doc key); changes on "new chat". */
  conversationId: string;
  lessonId: string;
  lessonTitle: string;
  /** Prior turns to render immediately + seed the realtime session with. */
  messages: ConversationMessage[];
  /**
   * Free-form (lesson-level) grounding: true when resuming a PAST conversation
   * (not pinned to the current step's problem). The current lesson's live
   * conversation stays grounded to the active step.
   */
  freeform: boolean;
  /** Still loading this conversation's messages from Firestore. */
  loaded: boolean;
  /** Mount key for the voice surface — changes on conversation identity / load. */
  key: string;
}

export interface KojiConversationApi {
  /** The conversation the panel should display + continue right now. */
  active: ActiveKojiConversation;
  /** Whether a past conversation (not the active current one) is being viewed. */
  viewingPast: boolean;
  /**
   * Append/replace a conversation's messages (debounced save), routed by
   * conversationId; the owning lessonId is stored as a field.
   */
  persist: (
    conversationId: string,
    lessonId: string,
    lessonTitle: string,
    messages: ConversationMessage[],
  ) => void;
  /**
   * Append a special "answer" bubble (a Check submission) to the CURRENT lesson
   * conversation — always the live current chat, never a resumed past one — so
   * every try is recorded even when Koji has never been opened (the store always
   * has a current conversation id to write to). Updates the in-memory slice for
   * instant display and debounce-saves it. No-op when AI is off.
   */
  appendAnswer: (answer: string, correct: boolean, stepIndex: number) => void;
  /**
   * Load + view a specific past conversation (free-form resume). Selecting the
   * active current conversation just returns to it.
   */
  openPast: (
    conversationId: string,
    lessonId: string,
    lessonTitle: string,
  ) => void;
  /** Return to the active current-lesson conversation. */
  backToCurrent: () => void;
  /**
   * Archive the current conversation (flush so it lands in history) and start a
   * fresh empty chat for the current lesson. No-op when the current conversation
   * is already empty and we're not viewing a past one.
   */
  startNewChat: () => void;
  /** Flush all pending debounced saves immediately (e.g. on panel close). */
  flush: () => void;
}

interface ViewingState {
  conversationId: string;
  lessonId: string;
  lessonTitle: string;
  messages: ConversationMessage[];
  loaded: boolean;
  /** Bumped per open so re-selecting the same conversation re-seeds a fresh session. */
  nonce: number;
}

export function useKojiConversation(
  currentLessonId: string,
  currentLessonTitle: string,
): KojiConversationApi {
  const ai = aiEnabled();

  // The current lesson's ACTIVE conversation id. Seeded with a fresh id (a
  // throwaway until the resolve effect lands — the surface stays "loading" until
  // then), and replaced by the resumed / newly-generated id on resolve, or by a
  // fresh id on "new chat".
  const [currentConversationId, setCurrentConversationId] = useState<string>(
    () => newConversationId(),
  );
  const [current, setCurrent] = useState<ConversationMessage[]>([]);
  // When AI is off the panel never renders, so start "loaded" to avoid any work.
  const [currentLoaded, setCurrentLoaded] = useState(!ai);
  const [viewing, setViewing] = useState<ViewingState | null>(null);

  // Per-conversationId debounced-save bookkeeping (so the right doc always gets
  // the final write even as the active conversation switches).
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const latestRef = useRef<
    Map<
      string,
      { lessonId: string; lessonTitle: string; messages: ConversationMessage[] }
    >
  >(new Map());
  const nonceRef = useRef(0);
  // True once the learner has written to the current-lesson conversation (an
  // answer bubble recorded via `appendAnswer`) — so the async resume below never
  // clobbers a conversation that was already started before it resolved (the
  // learner checked an answer immediately on load, faster than the Firestore
  // read). Only consulted during the one-shot resolve window.
  const touchedRef = useRef(false);

  // Resolve the lesson's active conversation once per lesson (AI-on only, so
  // AI-off makes no Firestore call). The hook remounts per lesson, so this runs
  // once and currentLessonId is effectively constant for the instance. State is
  // only set from the async result (never synchronously in the effect body).
  useEffect(() => {
    if (!ai) return;
    let cancelled = false;
    void loadLatestConversationForLesson(currentLessonId).then((result) => {
      if (cancelled) return;
      // The learner already started recording into the fresh (throwaway-id)
      // conversation before this resolved — keep it rather than clobbering those
      // answers with the resumed/empty result. It becomes a real conversation
      // doc; the next open resumes it normally.
      if (touchedRef.current) {
        setCurrentLoaded(true);
        return;
      }
      if (result) {
        setCurrentConversationId(result.conversationId);
        setCurrent(result.messages);
      } else {
        setCurrentConversationId(newConversationId());
        setCurrent([]);
      }
      setCurrentLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ai, currentLessonId]);

  const scheduleSave = useCallback(
    (
      conversationId: string,
      lessonId: string,
      lessonTitle: string,
      messages: ConversationMessage[],
    ) => {
      if (!ai) return;
      latestRef.current.set(conversationId, { lessonId, lessonTitle, messages });
      const timers = timersRef.current;
      const existing = timers.get(conversationId);
      if (existing) clearTimeout(existing);
      timers.set(
        conversationId,
        setTimeout(() => {
          timers.delete(conversationId);
          const latest = latestRef.current.get(conversationId);
          if (latest)
            void saveConversation(
              conversationId,
              latest.lessonId,
              latest.lessonTitle,
              latest.messages,
            );
        }, SAVE_DEBOUNCE_MS),
      );
    },
    [ai],
  );

  const persist = useCallback(
    (
      conversationId: string,
      lessonId: string,
      lessonTitle: string,
      messages: ConversationMessage[],
    ) => {
      if (!ai) return;
      // Update the matching in-memory slice for instant display; save by
      // conversationId so a flush always lands in the correct doc even if the
      // active view has moved on.
      if (conversationId === currentConversationId) {
        setCurrent(messages);
      } else {
        setViewing((v) =>
          v && v.conversationId === conversationId ? { ...v, messages } : v,
        );
      }
      scheduleSave(conversationId, lessonId, lessonTitle, messages);
    },
    [ai, scheduleSave, currentConversationId],
  );

  const appendAnswer = useCallback(
    (answer: string, correct: boolean, stepIndex: number) => {
      if (!ai) return;
      const text = answer.trim();
      if (!text) return;
      // Mark the current conversation as written-to so an in-flight resume can't
      // clobber it (see the resolve effect above).
      touchedRef.current = true;
      const message: ConversationMessage = {
        // Distinct, collision-safe id namespace ("answer-…") so it never clashes
        // with realtime item ids ("item_…") in the by-id merge, and is never
        // seeded into the realtime session.
        id: `answer-${newConversationId()}`,
        role: "user",
        kind: "answer",
        text,
        ts: Date.now(),
        correct,
        stepIndex,
      };
      // Always target the CURRENT lesson conversation (never a resumed past one),
      // so the record of tries belongs to the live attempt. Display updates
      // instantly via `current`; the save is debounced like any growing turn.
      const next = [...current, message];
      setCurrent(next);
      scheduleSave(currentConversationId, currentLessonId, currentLessonTitle, next);
    },
    [
      ai,
      current,
      currentConversationId,
      currentLessonId,
      currentLessonTitle,
      scheduleSave,
    ],
  );

  const openPast = useCallback(
    (conversationId: string, lessonId: string, lessonTitle: string) => {
      if (!ai) return;
      // Selecting the active current conversation just returns to its live view.
      if (conversationId === currentConversationId) {
        setViewing(null);
        return;
      }
      const nonce = (nonceRef.current += 1);
      setViewing({
        conversationId,
        lessonId,
        lessonTitle,
        messages: [],
        loaded: false,
        nonce,
      });
      void loadConversation(conversationId).then((messages) => {
        setViewing((v) =>
          v && v.conversationId === conversationId && v.nonce === nonce
            ? { ...v, messages, loaded: true }
            : v,
        );
      });
    },
    [ai, currentConversationId],
  );

  const backToCurrent = useCallback(() => setViewing(null), []);

  const flush = useCallback(() => {
    if (!ai) return;
    const timers = timersRef.current;
    timers.forEach((id, conversationId) => {
      clearTimeout(id);
      const latest = latestRef.current.get(conversationId);
      if (latest)
        void saveConversation(
          conversationId,
          latest.lessonId,
          latest.lessonTitle,
          latest.messages,
        );
    });
    timers.clear();
  }, [ai]);

  const startNewChat = useCallback(() => {
    if (!ai) return;
    // Nothing to archive: if we're viewing a past chat, just return to the
    // (already-fresh, empty) current one; otherwise it's a true no-op.
    if (current.length === 0) {
      if (viewing) setViewing(null);
      return;
    }
    // Land the current conversation in history immediately, then swap to a fresh
    // empty one for the same lesson. The previous conversation stays saved.
    flush();
    setViewing(null);
    setCurrentConversationId(newConversationId());
    setCurrent([]);
    setCurrentLoaded(true);
  }, [ai, current, viewing, flush]);

  // Flush any pending saves when the lesson unmounts (lesson change / exit).
  // The ref is updated in an effect (never during render), per codebase convention.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => () => flushRef.current(), []);

  const active = useMemo<ActiveKojiConversation>(() => {
    if (viewing) {
      return {
        conversationId: viewing.conversationId,
        lessonId: viewing.lessonId,
        lessonTitle: viewing.lessonTitle,
        messages: viewing.messages,
        freeform: true,
        loaded: viewing.loaded,
        key: `past:${viewing.conversationId}:${viewing.nonce}:${viewing.loaded ? 1 : 0}`,
      };
    }
    return {
      conversationId: currentConversationId,
      lessonId: currentLessonId,
      lessonTitle: currentLessonTitle,
      messages: current,
      freeform: false,
      loaded: currentLoaded,
      key: `cur:${currentConversationId}:${currentLoaded ? 1 : 0}`,
    };
  }, [
    viewing,
    current,
    currentLoaded,
    currentConversationId,
    currentLessonId,
    currentLessonTitle,
  ]);

  return useMemo<KojiConversationApi>(
    () => ({
      active,
      viewingPast: viewing !== null,
      persist,
      appendAnswer,
      openPast,
      backToCurrent,
      startNewChat,
      flush,
    }),
    [
      active,
      viewing,
      persist,
      appendAnswer,
      openPast,
      backToCurrent,
      startNewChat,
      flush,
    ],
  );
}
