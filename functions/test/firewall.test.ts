/**
 * Smoke test for the Pillar B security/correctness firewall (PRD §3.1, P3/P4).
 *
 * This is the "smallest thing that fails if the firewall logic breaks", not an
 * exhaustive suite: for every generable / fallback kind we assert the step both
 * passes `verify()` and round-trips through `gradeStep(step, correctAnswer(...))`
 * as "correct"; we pin the tile-expression commutativity fix, the numeric
 * answer/visual rejections, and the tutor hint-leak detector.
 *
 * Run: `npm test` (node:test via tsx — no extra framework).
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  GENERABLE_KINDS,
  assemble,
  verify,
  buildFallback,
  mulberry32,
  type GenerableKind,
  type Proposal,
} from "../src/shared/generation.js";
import { correctAnswer, gradeStep } from "../src/content/engine.js";
import { mentionsAnswer } from "../src/handlers/tutor.js";
import type { ProblemStep } from "../src/content/types.js";

// 3-4-5: an integer hypotenuse (required by tile-expression) that is valid for
// every other kind too, so one triple drives the whole matrix deterministically.
const A = 3;
const B = 4;

function makeProposal(kind: GenerableKind): Proposal {
  const base = {
    a: A,
    b: B,
    prompt: "Test prompt.",
    feedbackCorrect: "Correct.",
    feedbackDefault: "Try again.",
  };
  if (kind === "numeric") return { ...base, unit: "cm" } as Proposal;
  if (kind === "count-squares") return { ...base, countSide: "c" } as Proposal;
  return base as Proposal;
}

function assembleKind(kind: GenerableKind): ProblemStep {
  // Fixed seed + targetSide so the test is deterministic.
  return assemble(makeProposal(kind), {
    kind,
    difficulty: "easy",
    targetSide: "c",
    rng: mulberry32(42),
  });
}

test("every generable kind: verify() passes and the canonical answer grades correct", () => {
  for (const kind of GENERABLE_KINDS) {
    const step = assembleKind(kind);
    assert.equal(verify(step), true, `verify() should pass for kind=${kind}`);
    const evaluation = gradeStep(step, correctAnswer(step.interaction));
    assert.equal(evaluation.status, "correct", `round-trip grade should be correct for kind=${kind}`);
  }
});

test("every buildFallback kind: verify() passes and the canonical answer grades correct", () => {
  for (const kind of GENERABLE_KINDS) {
    const step = buildFallback(kind, "medium", 12345);
    assert.equal(verify(step), true, `fallback verify() should pass for kind=${kind}`);
    const evaluation = gradeStep(step, correctAnswer(step.interaction));
    assert.equal(
      evaluation.status,
      "correct",
      `fallback round-trip grade should be correct for kind=${kind}`,
    );
  }
});

test("tile-expression has a single blank and grades its canonical solution correct (commutativity regression)", () => {
  const step = assembleKind("tile-expression");
  assert.equal(step.interaction.kind, "tile-expression");
  if (step.interaction.kind !== "tile-expression") return;

  // The bug was a two-blank [a, b] template that marked the equally-valid [b, a]
  // placement wrong ~50% of the time; the fix blanks ONLY leg b.
  const blanks = step.interaction.template.filter((t) => t === null).length;
  assert.equal(blanks, 1, "template must have exactly one blank");
  assert.deepEqual(step.interaction.solution, [String(B)], "the blank is leg b");

  const evaluation = gradeStep(step, correctAnswer(step.interaction));
  assert.equal(evaluation.status, "correct");
});

test("numeric verify() rejects a tampered answer and a missing right-triangle visual", () => {
  const step = assembleKind("numeric");
  assert.equal(step.interaction.kind, "numeric");
  if (step.interaction.kind !== "numeric") return;

  // Tampered answer: the round-trip grader would still say "correct" (it trusts
  // the stored answer), but the firewall recomputes c=√(a²+b²) from the visual
  // and must reject the mismatch.
  const tampered: ProblemStep = {
    ...step,
    interaction: { ...step.interaction, answer: step.interaction.answer + 2 },
  };
  assert.equal(verify(tampered), false, "tampered numeric answer must be rejected");

  // Missing visual: can't independently recompute c, so it must reject.
  const noVisual = { ...step };
  delete (noVisual as { visual?: unknown }).visual;
  assert.equal(verify(noVisual), false, "numeric step without a right-triangle visual must be rejected");
});

test("mentionsAnswer flags numeric-answer leaks and ignores look-alikes (tutor firewall)", () => {
  // value=5 with a display string "5 cm" → robust value-based detection (C1).
  for (const leak of ["5", "5.0", "5 cm", "it's 5."]) {
    assert.equal(mentionsAnswer(leak, "5 cm", 5), true, `should flag leak: ${JSON.stringify(leak)}`);
  }
  for (const safe of ["15", "50", "0.5"]) {
    assert.equal(mentionsAnswer(safe, "5 cm", 5), false, `should NOT flag: ${JSON.stringify(safe)}`);
  }
});
