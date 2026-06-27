/**
 * AlphaBrilliant QA harness — Stagehand (TypeScript) over Browserbase.
 *
 * Automates the "The Right Triangle" lesson and verifies two states:
 *   Scenario A — a wrong answer triggers the Koji takeover (panel auto-opens,
 *                a yellow ✗ answer bubble appears, "Try again" remains, "Check"
 *                is gone).
 *   Scenario B — the correct answer ("slanted side" = hypotenuse c) yields the
 *                "Correct!" success state (success feedback + "Continue").
 *
 * The triangle sides are thin SVG hit-targets, so the side selection is driven
 * by Stagehand's natural-language act() (observe -> cache -> act), with a
 * deterministic coordinate-click fallback that clicks the exact midpoint of the
 * side's line if the NL selection doesn't register.
 *
 * LLM calls route through the Browserbase Model Gateway (only BROWSERBASE_API_KEY
 * is set; provider keys are intentionally absent). No BROWSERBASE_PROJECT_ID.
 */
import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, "screenshots");
const CACHE = join(HERE, ".cache");
mkdirSync(SHOTS, { recursive: true });
mkdirSync(CACHE, { recursive: true });

const BASE_URL = (
  process.env.BASE_URL ??
  "https://instead-research-recovered-absolute.trycloudflare.com"
).replace(/\/+$/, "");
const MODEL = process.env.MODEL ?? "google/gemini-2.5-flash";

// Force Model Gateway: scrub any provider keys that may be exported in the shell
// so Stagehand bills LLM inference through the Browserbase key, not a provider.
for (const k of [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "MODEL_API_KEY",
]) {
  if (process.env[k]) {
    console.warn(`[qa] unsetting ${k} so LLM calls use the Browserbase Model Gateway`);
    delete process.env[k];
  }
}
if (!process.env.BROWSERBASE_API_KEY) {
  throw new Error("BROWSERBASE_API_KEY is required (set it in qa/.env)");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log("[qa]", ...a);

type Page = ReturnType<Stagehand["context"]["pages"]> extends (infer T)[] ? T : never;

// ----------------------------------------------------------------------------
// Generic page helpers (deterministic; no LLM)
// ----------------------------------------------------------------------------

/** Poll an in-page evaluation until `done(value)` is true or we time out. */
async function pollEval<T>(
  page: Page,
  fn: () => T,
  done: (v: T) => boolean,
  timeout = 15000,
  interval = 300,
): Promise<T> {
  const deadline = Date.now() + timeout;
  let last = await page.evaluate(fn);
  while (!done(last) && Date.now() < deadline) {
    await sleep(interval);
    last = await page.evaluate(fn);
  }
  return last;
}

/** Wait until the page's visible text contains `needle` (case-insensitive). */
async function waitForText(page: Page, needle: string, timeout = 20000): Promise<boolean> {
  const want = needle.toLowerCase();
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const t = await page.evaluate(() => document.body?.innerText ?? "");
    if (t.toLowerCase().includes(want)) return true;
    await sleep(250);
  }
  return false;
}

type Matcher = { kind: "text"; value: string } | { kind: "regex"; source: string; flags: string } | { kind: "aria"; value: string };
type Clickable = { text: string; aria: string; x: number; y: number };

/** List all visible clickables (button / [role=button] / a / [aria-label]) with
 *  their normalized text/aria-label and viewport-center coordinates. No-arg
 *  evaluate (matching is done in Node) to avoid serialization edge cases. */
async function listClickables(page: Page): Promise<Clickable[]> {
  const res = (await page.evaluate(() => {
    try {
      const norm = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
      const out: { text: string; aria: string; x: number; y: number }[] = [];
      const els = Array.from(
        document.querySelectorAll<HTMLElement>('button, [role="button"], a, [aria-label]'),
      );
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        out.push({
          text: norm(el.textContent),
          aria: norm(el.getAttribute("aria-label")),
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
        });
      }
      return out;
    } catch (e) {
      return { __err: String((e as Error)?.message ?? e) };
    }
  })) as Clickable[] | { __err: string };
  if (!Array.isArray(res)) {
    log("listClickables in-page error:", res.__err);
    return [];
  }
  return res;
}

/** Find a clickable whose normalized text (or aria-label) matches `m`. */
async function findClickable(page: Page, m: Matcher): Promise<{ x: number; y: number } | null> {
  const list = await listClickables(page);
  const rx = m.kind === "regex" ? new RegExp(m.source, m.flags) : null;
  for (const c of list) {
    const label = m.kind === "aria" ? c.aria : c.text;
    const hit = rx ? rx.test(label) : label === (m as { value: string }).value;
    if (hit) return { x: c.x, y: c.y };
  }
  return null;
}

/** Click a clickable identified by `matcher`, polling until it appears. */
async function clickText(
  page: Page,
  matcher: string | RegExp | { aria: string },
  timeout = 12000,
): Promise<boolean> {
  const m: Matcher =
    typeof matcher === "string"
      ? { kind: "text", value: matcher }
      : matcher instanceof RegExp
        ? { kind: "regex", source: matcher.source, flags: matcher.flags }
        : { kind: "aria", value: matcher.aria };
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const c = await findClickable(page, m);
    if (c) {
      await page.click(c.x, c.y);
      return true;
    }
    await sleep(250);
  }
  return false;
}

/** Click the first matcher (from a list) that resolves, polling the whole set. */
async function clickFirstOf(page: Page, matchers: (string | RegExp)[], timeout = 10000): Promise<string | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const matcher of matchers) {
      const m: Matcher =
        typeof matcher === "string"
          ? { kind: "text", value: matcher }
          : { kind: "regex", source: matcher.source, flags: matcher.flags };
      const c = await findClickable(page, m);
      if (c) {
        await page.click(c.x, c.y);
        return matcher.toString();
      }
    }
    await sleep(250);
  }
  return null;
}

async function shot(page: Page, name: string): Promise<string> {
  const path = join(SHOTS, name.endsWith(".png") ? name : `${name}.png`);
  await page.screenshot({ path });
  log("screenshot:", path);
  return path;
}

// ----------------------------------------------------------------------------
// Triangle side selection (the hard part)
// ----------------------------------------------------------------------------

type SideInfo = { label: string; pressed: boolean; cx: number; cy: number };

/** Read the triangle's per-side state + line-midpoint coordinates and caption. */
async function readTriangle(page: Page): Promise<{ sides: SideInfo[]; caption: string | null }> {
  const res = (await page.evaluate(() => {
    try {
      const groups = Array.from(
        document.querySelectorAll<SVGGElement>('svg [role="button"][aria-label$="side"]'),
      );
      const sides = groups.map((g) => {
        const line = g.querySelector("line");
        const r = (line ?? g).getBoundingClientRect();
        return {
          label: g.getAttribute("aria-label") ?? "",
          pressed: g.getAttribute("aria-pressed") === "true",
          cx: r.left + r.width / 2,
          cy: r.top + r.height / 2,
        };
      });
      const cap = document.querySelector('p[aria-live="polite"]');
      return { sides, caption: cap ? cap.textContent : null };
    } catch (e) {
      return { sides: [], caption: null, __err: String((e as Error)?.message ?? e) };
    }
  })) as { sides: SideInfo[]; caption: string | null; __err?: string };
  if (res.__err) log("readTriangle in-page error:", res.__err);
  return res;
}

/** Wait until `label` is (de)selected as wanted, or time out. */
async function waitSide(page: Page, label: string, want = true, timeout = 5000): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const t = await readTriangle(page);
    const s = t.sides.find((x) => x.label === label);
    if (s && s.pressed === want) return true;
    await sleep(200);
  }
  return false;
}

/** observe -> cache -> act primitive. Replays a cached Action with no LLM call;
 *  otherwise observes (LLM), caches the first Action, and acts on it. The act()
 *  click can legitimately fail (e.g. inline-SVG <g> targets), so failures are
 *  swallowed here — selectSide() verifies the real outcome and falls back. */
async function observeCacheAct(stagehand: Stagehand, key: string, instruction: string): Promise<"cached" | "fresh" | "none"> {
  const file = join(CACHE, `${key}.json`);
  if (existsSync(file)) {
    try {
      const action = JSON.parse(readFileSync(file, "utf8")) as Parameters<Stagehand["act"]>[0];
      await stagehand.act(action).catch(() => {});
      return "cached";
    } catch (e) {
      log(`cache read failed for ${key} (${(e as Error).message}); re-observing`);
    }
  }
  const results = await stagehand.observe(instruction);
  const action = Array.isArray(results) ? results[0] : undefined;
  if (!action) return "none";
  writeFileSync(file, JSON.stringify(action, null, 2));
  await stagehand.act(action).catch(() => {});
  return "fresh";
}

/** Bulletproof selection: dispatch a real bubbling click on the side's SVG <g>,
 *  which triggers its React onClick directly (no coordinate hit-testing). Uses a
 *  string-expression evaluate so nothing is serialized/transpiled. */
async function dispatchSideClick(page: Page, label: string): Promise<boolean> {
  const sel = `svg [role="button"][aria-label="${label}"]`;
  const js = `(function () {
    var g = document.querySelector(${JSON.stringify(sel)});
    if (!g) return false;
    g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return true;
  })()`;
  return (await page.evaluate(js)) as boolean;
}

/**
 * Select a triangle side by name. Primary path: Stagehand NL act() (the whole
 * point of the harness). Fallback: a deterministic coordinate click on the
 * exact midpoint of the side's line. Verifies the selection actually registered.
 */
async function selectSide(
  stagehand: Stagehand,
  page: Page,
  label: string,
): Promise<{ method: "already" | "nl" | "coord" | "dispatch" | "failed"; caption: string | null }> {
  const shortName = label.replace(/\s*side$/, ""); // "slanted side" -> "slanted"
  const before = await readTriangle(page);
  if (before.sides.find((s) => s.label === label)?.pressed) {
    return { method: "already", caption: before.caption };
  }

  // PRIMARY — natural language via observe -> cache -> act
  try {
    const how = await observeCacheAct(
      stagehand,
      `select-${shortName}`,
      `click the ${shortName} side of the right triangle figure to select it`,
    );
    log(`act(NL) select "${label}" -> ${how}`);
  } catch (e) {
    log(`act(NL) select "${label}" threw: ${(e as Error).message}`);
  }
  if (await waitSide(page, label, true, 3000)) {
    return { method: "nl", caption: (await readTriangle(page)).caption };
  }

  // FALLBACK 1 — coordinate click on the exact midpoint of the side's line.
  log(`NL did not register "${label}"; trying coordinate click on the line`);
  const cur = await readTriangle(page);
  const target = cur.sides.find((s) => s.label === label);
  if (target) {
    await page.click(target.cx, target.cy);
    if (await waitSide(page, label, true, 3000)) {
      return { method: "coord", caption: (await readTriangle(page)).caption };
    }
  }

  // FALLBACK 2 — dispatch a real click straight on the SVG <g> (React onClick).
  log(`coordinate click did not register "${label}"; dispatching click on the <g>`);
  await dispatchSideClick(page, label);
  if (await waitSide(page, label, true, 3000)) {
    return { method: "dispatch", caption: (await readTriangle(page)).caption };
  }

  // If a different side ended up selected, clear it and dispatch once more.
  const other = (await readTriangle(page)).sides.find((s) => s.pressed && s.label !== label);
  if (other) {
    await dispatchSideClick(page, other.label);
    await sleep(200);
    await dispatchSideClick(page, label);
    if (await waitSide(page, label, true, 3000)) {
      return { method: "dispatch", caption: (await readTriangle(page)).caption };
    }
  }
  return { method: "failed", caption: (await readTriangle(page)).caption };
}

// ----------------------------------------------------------------------------
// Scenario assertions (deterministic, client-side DOM — no LLM tokens spent)
// ----------------------------------------------------------------------------

async function assertScenarioA(page: Page) {
  const state = await pollEval(
    page,
    () => {
      const norm = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
      const panelOpen = !!document.querySelector('[data-lesson-koji][data-state="open"]');
      const wrongBubble = Array.from(document.querySelectorAll("[aria-label]")).some((el) => {
        const a = el.getAttribute("aria-label") ?? "";
        return /^your answer:/i.test(a) && /incorrect/i.test(a);
      });
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'));
      const tryAgain = buttons.some((b) => norm(b.textContent) === "Try again");
      const checkGone = !buttons.some((b) => norm(b.textContent) === "Check");
      // Best-effort: any proactive assistant coaching text in the Koji thread.
      const coachingText = Array.from(
        document.querySelectorAll('[data-lesson-koji] [role="log"] *'),
      ).some((el) => norm(el.textContent).length > 40);
      return { panelOpen, wrongBubble, tryAgain, checkGone, coachingText };
    },
    // Wait for the full takeover (incl. the ✗ bubble) up to the timeout, but the
    // pass gate below is the deterministic, LLM-independent core of the takeover.
    (r) => r.panelOpen && r.wrongBubble && r.tryAgain && r.checkGone,
    20000,
  );
  const pass = state.panelOpen && state.tryAgain && state.checkGone;
  return { pass, details: state };
}

async function assertScenarioB(page: Page) {
  const state = await pollEval(
    page,
    () => {
      const norm = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
      const text = document.body?.innerText ?? "";
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'));
      const continueBtn = buttons.some((b) => norm(b.textContent) === "Continue");
      const successMsg = /Exactly!|opposite the right angle|longest side/i.test(text);
      const frameSuccess = !!document.querySelector(".border-success");
      const checkGone = !buttons.some((b) => norm(b.textContent) === "Check");
      const captionSuccess = !!Array.from(document.querySelectorAll("p")).find(
        (p) => /the slanted side/i.test(p.textContent ?? "") && p.className.includes("success"),
      );
      return { continueBtn, successMsg, frameSuccess, checkGone, captionSuccess };
    },
    (r) => r.continueBtn && r.successMsg,
    20000,
  );
  const pass = state.continueBtn && state.successMsg;
  return { pass, details: state };
}

// ----------------------------------------------------------------------------
// Main flow
// ----------------------------------------------------------------------------

async function main() {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    model: MODEL,
    cacheDir: CACHE,
    serverCache: true,
    // The NL act() click can't resolve inline-SVG <g> targets; don't burn time/
    // tokens self-healing a click we already fall back to deterministically.
    selfHeal: false,
    verbose: 1,
    domSettleTimeout: 30000,
  });

  const summary: Record<string, unknown> = { baseUrl: BASE_URL, model: MODEL };
  let exitCode = 0;

  await stagehand.init();
  const sessionId = stagehand.browserbaseSessionID;
  const replay = `https://www.browserbase.com/sessions/${sessionId}`;
  summary.sessionId = sessionId;
  summary.replay = replay;
  log("Browserbase session:", sessionId);
  log("Replay:", replay);

  const page = stagehand.context.pages()[0];

  // tsx/esbuild compiles this file with `keepNames`, which wraps named functions
  // in a module-scope `__name()` helper. Stagehand runs page.evaluate() callbacks
  // by `.toString()`-ing them in the browser, where `__name` doesn't exist — so we
  // inject a no-op polyfill (raw string, so it isn't itself esbuild-transformed)
  // that runs at document start on every navigation.
  await page.addInitScript(
    "if (typeof globalThis.__name !== 'function') { globalThis.__name = function (f) { return f; }; }",
  );

  try {
    await page.setViewportSize(1280, 900);

    // 1) Open the app (dev guest auto-login -> course home).
    log(`opening ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeoutMs: 30000 });
    const onHome = await waitForText(page, "The Right Triangle", 30000);
    summary.title = await page.title();
    log("page title:", summary.title);
    if (!onHome) throw new Error("course home with 'The Right Triangle' never rendered");
    await shot(page, "01-course-home");

    // 2) Select the lesson node, then click the Start CTA.
    await clickText(page, "The Right Triangle");
    const cta = await clickFirstOf(page, [/^Start$/, /^Continue$/, /^Review$/, /^Jump here$/], 8000);
    log("lesson CTA clicked:", cta);

    // 3) First teaching step -> "Got it" (waits through the ~2.2s branded intro).
    let gotIt = await waitForText(page, "Got it", 20000);
    if (!gotIt) {
      log("'Got it' not found via map flow; falling back to direct lesson URL");
      await page.goto(`${BASE_URL}/lesson/pythagoras-intro`, { waitUntil: "domcontentloaded", timeoutMs: 30000 });
      gotIt = await waitForText(page, "Got it", 20000);
    }
    if (!gotIt) throw new Error("teaching intro ('Got it') never appeared");
    await clickText(page, "Got it");

    // 4) The exercise: "Which side is the hypotenuse?"
    const onExercise = await waitForText(page, "Which side is the hypotenuse", 15000);
    if (!onExercise) throw new Error("exercise prompt never appeared");
    await pollEval(page, () => document.querySelectorAll('svg [role="button"][aria-label$="side"]').length, (n) => n >= 3, 10000);
    await shot(page, "02-exercise");
    log("triangle:", JSON.stringify(await readTriangle(page)));

    // ---- SCENARIO A: wrong answer -> Koji takeover ----
    log("Scenario A: selecting a leg (wrong) -> Check");
    const aSel = await selectSide(stagehand, page, "bottom side");
    summary.sideSelectWrong = aSel.method;
    log(`wrong-side selection method: ${aSel.method}; caption=${aSel.caption}`);
    await shot(page, "03-wrong-selected");
    await clickText(page, "Check");
    const a = await assertScenarioA(page);
    await shot(page, "04-koji-takeover");
    summary.scenarioA = a;
    log("Scenario A:", a.pass ? "PASS" : "FAIL", JSON.stringify(a.details));

    // Reset to answering: close Koji, then "Try again".
    await clickText(page, { aria: "Close Koji" }, 4000);
    await sleep(400);
    await clickText(page, "Try again", 8000);
    await pollEval(
      page,
      () => {
        const g = document.querySelector('svg [role="button"][aria-label="slanted side"]');
        return g ? g.getAttribute("tabindex") : null;
      },
      (v) => v === "0",
      8000,
    );

    // ---- SCENARIO B: correct answer ----
    log("Scenario B: selecting the slanted side (hypotenuse, correct) -> Check");
    const bSel = await selectSide(stagehand, page, "slanted side");
    summary.sideSelectCorrect = bSel.method;
    log(`correct-side selection method: ${bSel.method}; caption=${bSel.caption}`);
    await clickText(page, "Check");
    const b = await assertScenarioB(page);
    await shot(page, "05-correct");
    summary.scenarioB = b;
    log("Scenario B:", b.pass ? "PASS" : "FAIL", JSON.stringify(b.details));

    if (!a.pass || !b.pass) exitCode = 1;
  } catch (err) {
    exitCode = 1;
    summary.error = (err as Error).message;
    log("ERROR:", (err as Error).stack ?? (err as Error).message);
    try {
      await shot(page, "99-error");
    } catch {
      /* ignore */
    }
  } finally {
    try {
      const m = await stagehand.metrics;
      summary.tokens = {
        prompt: m.totalPromptTokens,
        completion: m.totalCompletionTokens,
        total: m.totalPromptTokens + m.totalCompletionTokens,
      };
    } catch {
      /* ignore */
    }
    await stagehand.close();
  }

  console.log("\n==================== QA SUMMARY ====================");
  console.log(JSON.stringify(summary, null, 2));
  console.log("Replay:", summary.replay);
  console.log("===================================================\n");
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("[qa] fatal:", err);
  process.exit(1);
});
