# AlphaBrilliant QA harness (Stagehand + Browserbase)

A self-contained [Stagehand](https://docs.stagehand.dev) (TypeScript) harness that
drives the **AlphaBrilliant** "The Right Triangle" lesson on a cloud
[Browserbase](https://browserbase.com) browser and verifies two states:

- **Scenario A — wrong answer triggers the Koji takeover:** select a leg
  ("bottom side"), Check → the Koji panel auto-opens, a yellow ✗ answer bubble
  appears, "Try again" remains, and "Check" is gone.
- **Scenario B — correct answer:** select the "slanted side" (the hypotenuse c),
  Check → the "Correct!" success state (success feedback + "Continue").

This folder is **isolated** from the app: its own `package.json` / `node_modules`,
so it never touches the app's root deps, `src/`, or tsconfigs.

## Prerequisites

- Node 18+.
- The app dev server + a public tunnel to it must be reachable at `BASE_URL`
  (the dev build auto-signs-in as a guest, so there is **no login wall**).
- A Browserbase API key with Model Gateway access.

## Setup

```bash
cd qa
npm install            # already done if node_modules/ exists
cp .env.example .env   # then fill in BROWSERBASE_API_KEY (a default is provided)
```

`.env` keys:

| Key | Purpose |
| --- | --- |
| `BROWSERBASE_API_KEY` | The **only** credential needed. Resolves the project automatically. |
| `BASE_URL` | Target under test. Defaults to the cloudflared tunnel to the local dev server. |
| `MODEL` | Browserbase Model Gateway model. Default `google/gemini-2.5-flash`. |

## Run

```bash
npm run qa      # or: npm start
```

It prints the **full Browserbase session replay link**
(`https://www.browserbase.com/sessions/<id>`), writes screenshots to
`screenshots/`, prints a JSON summary (pass/fail per scenario, side-selection
method, token usage), and exits non-zero if either scenario fails.

## Pointing BASE_URL at the tunnel vs prod

- **Tunnel (default, recommended):** the dev build auto-guest-logs-in, so the
  harness lands straight in the app. The tunnel URL is **ephemeral** — if it
  rotates, update `BASE_URL` in `.env`.
- **Prod (`https://main-alpha-pink.vercel.app`):** **auth-walled**, so it is *not*
  a valid target for this harness as written (there is no guest auto-login). It
  would need a sign-in step added first.

## How it works / design notes

- **Model Gateway, no provider keys.** Only `BROWSERBASE_API_KEY` is set; provider
  keys (OpenAI/Google/Anthropic/`MODEL_API_KEY`) are intentionally **absent** and
  are also scrubbed from `process.env` at startup, so all LLM inference routes
  through the Browserbase Model Gateway (one key, one bill).
- **No `BROWSERBASE_PROJECT_ID`.** The API key resolves the project; passing a
  project id is unnecessary (older docs are outdated on this).
- **observe → cache → act.** Side selection uses Stagehand's natural-language
  `act()` planned via `observe()`, cached to `./.cache` (plus `cacheDir` +
  server-side caching). Cached actions replay deterministically with **no LLM
  call**, so repeat runs are fast and nearly free.
- **The thin-SVG problem.** The triangle sides are thin SVG hit-targets. The
  harness selects them by natural language first, then **verifies the selection
  actually registered** (`aria-pressed`); if not, it falls back to a deterministic
  coordinate click on the exact midpoint of the side's line.
- **Assertions are deterministic DOM checks** (panel `data-state`, the
  `aria-label="Your answer: … — incorrect"` bubble, button text, success
  feedback) rather than extra LLM calls — reliable and cost-free.
- **Element waits, not fixed sleeps**, and the whole run completes well under the
  Browserbase 5-minute session cap.

## Model Gateway $5 cap (free plan)

The free plan caps Model Gateway usage at **$5 of tokens**. This harness keeps
LLM usage tiny (a couple of `observe()` calls, then cached replays) so it stays
far under the cap. If LLM calls suddenly start failing mid-run with auth/quota
errors, that is almost certainly the **$5 cap** being hit — not a broken key.
If the chosen `MODEL` returns a 400, it's an unsupported id; pick another from
<https://docs.browserbase.com/platform/model-gateway/overview>.

## Files

- `qa.ts` — the harness (run with `npm run qa`).
- `package.json`, `tsconfig.json` — isolated config.
- `.env` / `.env.example` — configuration (`.env` is gitignored).
- `screenshots/` — captured states (gitignored).
- `.cache/` — cached `observe()` actions (gitignored).
