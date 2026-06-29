import { useEffect, useState } from "react";

import { cn } from "../../lib/cn";

export interface QuizResultsProps {
  /** Number of questions answered correctly this attempt. */
  score: number;
  /** Total questions in the quiz. */
  total: number;
  /** Score needed to pass. */
  passThreshold: number;
  /** Whether the learner passed (score ≥ threshold). */
  passed: boolean;
  /** "review" reframes the copy as a spaced-review summary (no pass/fail). */
  mode?: "quiz" | "review";
}

/**
 * The scored result body for the end-of-lesson quiz: the overall score and the
 * pass threshold. The action buttons (Continue / Retry / Exit) live in the
 * runner's footer, so this is purely the stage content.
 *
 * It deliberately shows only the total score — never a per-question breakdown —
 * so the quiz can't reveal which specific questions the learner got right.
 *
 * Entrance is a single transform/opacity fade-up (it's seen rarely, so a small
 * flourish is welcome), disabled under `prefers-reduced-motion`.
 */
export function QuizResults({
  score,
  total,
  passThreshold,
  passed,
  mode = "quiz",
}: QuizResultsProps) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const isReview = mode === "review";

  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center px-4 py-8 text-center",
        "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none",
        shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        {isReview ? "Review complete" : passed ? "Quiz passed!" : "Almost there"}
      </h2>

      <p
        className="mt-2 text-5xl font-bold leading-none tabular-nums text-foreground"
        aria-label={`You scored ${score} out of ${total}`}
      >
        <span className={passed ? "text-success" : "text-warning"}>{score}</span>
        <span className="text-muted"> / {total}</span>
      </p>

      <p className="mt-3 text-base text-muted">
        {isReview
          ? "Recall keeps skills from fading. Skills you recalled when due are now mastered."
          : passed
            ? "Great recall! You're ready to move on."
            : `You need ${passThreshold} of ${total} correct to pass. Give it another go.`}
      </p>
    </div>
  );
}
