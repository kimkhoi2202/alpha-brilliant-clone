import type { GridPoint } from "../../content/types";
import { CoordinateGrid } from "../visuals/coordinate-grid";

export interface PlotPointsGridProps {
  size: number;
  markers?: GridPoint[];
  placed: GridPoint[];
  targetCount: number;
  onPlace: (point: GridPoint) => void;
  onClear: () => void;
  disabled?: boolean;
}

/** Tap-to-place interaction built on the coordinate grid. */
export function PlotPointsGrid({
  size,
  markers,
  placed,
  targetCount,
  onPlace,
  onClear,
  disabled,
}: PlotPointsGridProps) {
  const remaining = targetCount - placed.length;

  return (
    <div className="flex flex-col items-center gap-3">
      <CoordinateGrid
        size={size}
        markers={markers}
        placed={placed}
        onPlace={disabled ? undefined : onPlace}
      />
      <p className="text-sm text-muted" aria-live="polite">
        {placed.length === 0
          ? `Tap the grid to place ${targetCount} point${targetCount > 1 ? "s" : ""}.`
          : remaining > 0
            ? `${remaining} more to place.`
            : "Ready — tap Check, or clear to redo."}
      </p>
      {placed.length > 0 && !disabled ? (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
