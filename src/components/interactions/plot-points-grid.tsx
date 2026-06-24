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
        onRemove={disabled ? undefined : () => onClear()}
      />
      <p className="text-sm text-muted" aria-live="polite">
        {placed.length === 0
          ? `Tap the grid to place ${targetCount} point${targetCount > 1 ? "s" : ""}.`
          : remaining > 0
            ? `${remaining} more to place.`
            : "Ready, tap Check or tap the point to redo."}
      </p>
    </div>
  );
}
