import { Button } from "../ui";

export interface PracticePromoCardProps {
  onStart: () => void;
}

/**
 * Course-map entry point into Infinite Practice. Shown only once the course's
 * `level-review` is complete and AI is on (the gating lives in the course map),
 * so practice is "reached after the level review" rather than a per-lesson button.
 */
export function PracticePromoCard({ onStart }: PracticePromoCardProps) {
  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">
        New
      </p>
      <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">
        Infinite Practice
      </h3>
      <p className="mt-1.5 text-sm leading-5 text-muted">
        Fresh, verified problems tuned to your level. Never run out.
      </p>
      <Button
        variant="accent"
        size="lg"
        className="mt-4 w-full"
        onPress={onStart}
      >
        Practice
      </Button>
    </div>
  );
}
