# Demo script — AlphaBrilliant Phase 2 (3–5 min)

A tight walkthrough of the learn-by-doing course and the AI-native **Koji** tutor, ending by proving the app still teaches with **AI turned off**. Subject: the Pythagorean theorem.

## Before you record

- [ ] `functions/.env` has `OPENAI_API_KEY`; functions are running (deployed, or emulator) so the callables resolve.
- [ ] Client built with **`VITE_AI_ENABLED=true`**; you're signed in.
- [ ] Have a fresh tab ready built with **`VITE_AI_ENABLED=false`** for the finale (or be ready to flip the flag + reload).
- [ ] Use a **phone-sized viewport** — it shows the mobile-first UI and reads better on video.
- [ ] Sound on (for the voice segment); mic permission pre-granted.

Total ≈ 4–5 min. Times are budgets, not scripts.

---

## 1 · The core loop — a lesson with instant feedback (~60s)

**Do:** From the course map, open **Lesson 1 — Pythagoras' Theorem**. Work a problem or two: drag the right triangle, then answer an interaction (e.g. pick a side / count squares / a numeric step).

**Say:** "Every lesson is hands-on — you play with the idea, then it's named. Answers are graded **instantly, client-side, in under 100 ms** — no network, no AI."

**Watch for:** the green correct state and Koji's celebration; specific feedback on a wrong attempt (a targeted hint, not just a red X).

## 2 · The course path & progress (~30s)

**Do:** Return to the **course map**. Point at the path: the five lessons + **Level Review**, mastery medallions, the streak.

**Say:** "Progress and mastery persist per user in Firestore — lessons unlock along the path, and you resume where you left off."

## 3 · Koji: hint → "why was that wrong?" → effort-gated reveal (~90s)

**Do:** Open a problem in **Lesson 3 — Finding a Missing Side**. Tap **Ask Koji** (bottom-left).
1. **Hint:** ask for a hint. Note it nudges ("use `a² + b² = c²`; decide what you know") **without giving the number**.
2. **Wrong on purpose:** submit a classic miss (e.g. add the legs instead of squaring). Ask **"Why was that wrong?"** — Koji names *that specific* mistake.
3. **Try the reveal too early / or after effort:** ask Koji to **reveal the answer**.

**Say:** "Koji is grounded in the lesson's typed state — he sees the actual step, not the screen text. Hints never leak the answer; that's enforced in code, not just asked of the model. And the reveal is **earned**: you only get the worked solution after a genuine attempt *and* engaging Koji — then it names your gap and shows engine-computed steps, marked `assisted` so it never counts as mastery."

**Watch for:** if you ask too early, Koji declines and tells you to attempt/engage first; once unlocked, the reveal explains the gap, not just the value.

## 4 · Realtime voice driving a tool (~60s)

**Do:** In Koji, switch to **voice** (tap-to-talk, or toggle hands-free). Speak a request that triggers an action, e.g. *"Koji, give me two more problems like this"* or *"take me to the next lesson."*

**Say:** "This is speech-to-speech with `gpt-realtime-2` — a warm voice, a live transcript, and natural barge-in. Crucially, Koji **calls the app's tools mid-conversation** — so he doesn't just talk, he operates the app with me."

**Watch for:** the live transcript updating, Koji speaking a short preamble while acting, and the app actually responding to the spoken command (navigates / generates).

## 5 · Verified "Infinite Practice" (~45s)

**Do:** Go to **Infinite Practice** (available after Level Review). Solve a couple; let the difficulty pill adapt; show the session stats (solved / streak).

**Say:** "These problems are **AI-generated but verified**. The model proposes a scenario; **our engine computes the answer key** and round-trips it through the grader **before** anything renders. If a proposal fails, it's discarded and regenerated — so every problem you see is solvable and graded correctly."

## 6 · The finale — it still teaches with AI off (~45s)

**Do:** Switch to the tab built with **`VITE_AI_ENABLED=false`** (or flip the flag and reload). Re-open a lesson and work a problem.

**Say:** "Flip one flag and the AI is gone — Koji goes dormant, voice and Infinite Practice disappear, the plain 'See answer' returns. What's left is **byte-for-byte the Phase 1 app**: hand-written hints and feedback, instant grading, full course path. The AI is **additive, never load-bearing** — it's the upgrade, not the product."

**Watch for:** no broken UI, no dead-ends, no console errors — it just teaches.

---

## One-line wrap

"Koji is a grounded, tool-using tutor whose every output is verified by our own engine — and the whole thing still teaches with the AI switched off."
