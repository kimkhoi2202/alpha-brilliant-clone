import { forwardRef, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ButtonHTMLAttributes,
  PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "../../lib/cn";

export interface ExpressionBankItem {
  id: string;
  label: string;
  used?: boolean;
}

export interface TileExpressionQuestionProps {
  /** Expression tokens; `null` marks a blank slot (in order). */
  parts: (string | null)[];
  /** Value currently in each blank (by order); `null` = empty. */
  blanks: (string | null)[];
  bank: ExpressionBankItem[];
  onBlankPress?: (blankIndex: number) => void;
  onBankPress?: (id: string) => void;
  onDropToBlank?: (id: string, blankIndex: number) => void;
  className?: string;
}

/** Maps each part index to its blank-slot index (or -1 for static tokens). */
function blankSlotIndices(parts: (string | null)[]): number[] {
  let count = 0;
  return parts.map((part) => (part === null ? count++ : -1));
}

type DragSource =
  | { kind: "bank" }
  | { kind: "blank"; blankIndex: number };

/** Center point + base (un-transformed) size of a slot the ghost can fill. */
type SnapTarget = { cx: number; cy: number; w: number; h: number };

type ActiveDrag = {
  id: string;
  label: string;
  source: DragSource;
  pointerId: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  overBlank: number | null;
  /** Center + base size of `overBlank` so the ghost can grow to fill it. */
  snap: SnapTarget | null;
  hasMoved: boolean;
};

const DRAG_THRESHOLD_PX = 6;
const DROP_MAGNET_PX = 18;
/** Fraction of a slot a snapped tile fills; <1 leaves a frame around it. */
const SNAP_FILL_RATIO = 0.9;
/** Subtle lift applied to the free-floating (cursor-following) ghost. */
const FREE_LIFT_SCALE = 1.06;

function movedEnough(drag: ActiveDrag, x: number, y: number) {
  return (
    Math.hypot(x - drag.startX, y - drag.startY) >= DRAG_THRESHOLD_PX
  );
}

const TileButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { isDragging?: boolean }
>(function TileButton({ children, className, isDragging, ...props }, ref) {
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      className={cn(
        "relative inline-flex select-none items-center justify-center border-4 font-bold text-foreground outline-none",
        "touch-none [-webkit-user-drag:none] [user-select:none]",
        "transition-[background-color,border-color,box-shadow,opacity,transform] duration-150 ease-out",
        "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "motion-reduce:transition-none",
        isDragging && "opacity-30",
        className,
      )}
    >
      {children}
    </button>
  );
});

/** Fill-in-the-blank expression with premium pointer dragging and tap fallback. */
export function TileExpressionQuestion({
  parts,
  blanks,
  bank,
  onBlankPress,
  onBankPress,
  onDropToBlank,
  className,
}: TileExpressionQuestionProps) {
  const statusId = useId();
  const slotIndices = blankSlotIndices(parts);
  const blankRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const suppressNextClickRef = useRef(false);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const [activeDrag, setActiveDragState] = useState<ActiveDrag | null>(null);
  const [dragStatus, setDragStatus] = useState("");

  const setActiveDrag = (drag: ActiveDrag | null) => {
    activeDragRef.current = drag;
    setActiveDragState(drag);
  };

  const suppressNextClick = () => {
    suppressNextClickRef.current = true;
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 0);
  };

  const findBlankAtPoint = (x: number, y: number): number | null => {
    let bestIndex: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    blankRefs.current.forEach((node, index) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const insideMagnet =
        x >= rect.left - DROP_MAGNET_PX &&
        x <= rect.right + DROP_MAGNET_PX &&
        y >= rect.top - DROP_MAGNET_PX &&
        y <= rect.bottom + DROP_MAGNET_PX;
      if (!insideMagnet) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(x - centerX, y - centerY);
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    });

    return bestIndex;
  };

  /**
   * Center point and base (un-transformed) size of `blankIndex`, so the ghost
   * can grow to fill the slot while still held. Returns null when there is no
   * target (drag is free-floating). Uses `offsetWidth/Height` for the base size
   * so the highlighted (scaled) slot still frames the tile, like a placed tile.
   */
  const snapTargetForBlank = (blankIndex: number | null): SnapTarget | null => {
    if (blankIndex === null) return null;
    const node = blankRefs.current[blankIndex];
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      w: node.offsetWidth,
      h: node.offsetHeight,
    };
  };

  const startDrag =
    (id: string, label: string, source: DragSource) =>
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const rect = event.currentTarget.getBoundingClientRect();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Pointer capture is a progressive enhancement. */
      }

      const overBlank = findBlankAtPoint(event.clientX, event.clientY);

      setActiveDrag({
        id,
        label,
        source,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        width: rect.width,
        height: rect.height,
        pointerOffsetX: event.clientX - rect.left,
        pointerOffsetY: event.clientY - rect.top,
        overBlank,
        snap: snapTargetForBlank(overBlank),
        hasMoved: false,
      });
      setDragStatus(`Dragging ${label}. Move over a blank and release.`);
    };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = activeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    const overBlank = findBlankAtPoint(event.clientX, event.clientY);
    const nextDrag = {
      ...drag,
      x: event.clientX,
      y: event.clientY,
      overBlank,
      snap: snapTargetForBlank(overBlank),
      hasMoved: drag.hasMoved || movedEnough(drag, event.clientX, event.clientY),
    };
    setActiveDrag(nextDrag);
    setDragStatus(
      overBlank === null
        ? `Dragging ${drag.label}. Move over a blank to snap it in.`
        : `${drag.label} snapped into blank ${overBlank + 1}. Release to place, or drag out to keep moving.`,
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = activeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* Ignore browsers that do not expose pointer capture state. */
    }

    const moved = drag.hasMoved || movedEnough(drag, event.clientX, event.clientY);
    const targetBlank = findBlankAtPoint(event.clientX, event.clientY);
    const shouldDrop = moved && targetBlank !== null;

    if (moved) suppressNextClick();
    setActiveDrag(null);

    if (shouldDrop) {
      onDropToBlank?.(drag.id, targetBlank);
      setDragStatus(`${drag.label} placed in blank ${targetBlank + 1}.`);
    } else {
      setDragStatus(moved ? `${drag.label} returned.` : "");
    }
  };

  const cancelDrag = () => {
    if (activeDragRef.current?.hasMoved) suppressNextClick();
    setActiveDrag(null);
    setDragStatus("");
  };

  const handleBankClick = (id: string) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    onBankPress?.(id);
  };

  const handleBlankClick = (blankIndex: number) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    onBlankPress?.(blankIndex);
  };

  // Floating ghost. Free-floating it tracks the cursor at its own size; once it
  // is over a blank it grows (uniform, transform-only scale) to fill that slot
  // and settles in like a placed tile, with the slot highlighted as the frame.
  // Leaving the slot frees it to follow the cursor again. Release over a slot
  // commits; release elsewhere returns it to the bank. Origin is the top-left in
  // both states so the transform morphs smoothly between cursor-follow and slot.
  const ghostNode = (() => {
    if (!activeDrag) return null;
    const snap = activeDrag.overBlank !== null ? activeDrag.snap : null;
    const isSnapped = snap !== null;

    let transform: string;
    if (snap) {
      // Uniform scale-to-fit keeps the tile undistorted while filling the slot.
      const scale =
        SNAP_FILL_RATIO *
        Math.min(snap.w / activeDrag.width, snap.h / activeDrag.height);
      const tx = snap.cx - (activeDrag.width / 2) * scale;
      const ty = snap.cy - (activeDrag.height / 2) * scale;
      transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    } else {
      const tx = activeDrag.x - activeDrag.pointerOffsetX * FREE_LIFT_SCALE;
      const ty = activeDrag.y - activeDrag.pointerOffsetY * FREE_LIFT_SCALE;
      transform = `translate3d(${tx}px, ${ty}px, 0) scale(${FREE_LIFT_SCALE})`;
    }

    // Only animate once moving, so a press that starts over a slot appears
    // placed instantly (no fly-in flash); free cursor-follow stays instant too.
    const morph = isSnapped && activeDrag.hasMoved;

    return (
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-50 flex items-center justify-center rounded-[16px] border-4 border-accent bg-surface text-3xl font-bold text-foreground will-change-transform motion-reduce:transition-none",
          // Grow+settle into a slot is animated; free cursor-follow is instant.
          morph && "transition-[transform,box-shadow] duration-150 ease-out",
          isSnapped
            ? "shadow-[0_0_0_1px_rgba(69,109,255,0.7),0_12px_30px_rgba(69,109,255,0.22)]"
            : "shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,255,255,0.08)]",
        )}
        style={{
          width: activeDrag.width,
          height: activeDrag.height,
          transformOrigin: "0 0",
          transform,
        }}
      >
        <span className="leading-none">{activeDrag.label}</span>
      </div>
    );
  })();

  return (
    <div className={cn("relative isolate flex flex-col items-center gap-4", className)}>
      <p id={statusId} className="sr-only" aria-live="polite">
        {dragStatus}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 text-3xl font-bold text-foreground sm:gap-6 sm:text-4xl">
        {parts.map((part, i) => {
          if (part !== null) {
            // A "²" exponent should hug the token before it: pull it tight
            // (cancelling the row gap) and shrink it so it reads as a real
            // superscript instead of a floating, full-size digit.
            if (part === "²") {
              return (
                <span
                  key={i}
                  className="-ml-3 select-none self-start text-[0.6em] leading-none sm:-ml-5"
                >
                  ²
                </span>
              );
            }
            return (
              <span key={i} className="select-none leading-none">
                {part}
              </span>
            );
          }
          const blankIndex = slotIndices[i];
          const value = blanks[blankIndex];
          const isDropTarget = activeDrag?.overBlank === blankIndex;
          const isDraggingThisBlank =
            activeDrag?.source.kind === "blank" &&
            activeDrag.source.blankIndex === blankIndex;

          return (
            <TileButton
              key={i}
              ref={(node) => {
                blankRefs.current[blankIndex] = node;
              }}
              onClick={() => handleBlankClick(blankIndex)}
              onPointerDown={
                value
                  ? startDrag(value, value, { kind: "blank", blankIndex })
                  : undefined
              }
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={cancelDrag}
              isDragging={isDraggingThisBlank}
              aria-label={
                value
                  ? `Blank ${blankIndex + 1}, ${value}. Press to clear or drag to another blank.`
                  : `Blank ${blankIndex + 1}. Drop a tile here.`
              }
              aria-describedby={statusId}
              className={cn(
                "h-[54px] w-[68px] rounded-[16px]",
                value
                  ? "border-accent bg-accent/10 text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_36px_rgba(69,109,255,0.08)]"
                  : "border-dashed border-white/30 bg-transparent text-transparent",
                !value && !isDropTarget && "shadow-none",
                isDropTarget &&
                  "scale-[1.03] border-accent bg-accent/15 shadow-[0_0_0_1.5px_rgba(69,109,255,0.7),0_18px_55px_rgba(69,109,255,0.24)]",
              )}
            >
              <span className="leading-none">{value ?? ""}</span>
            </TileButton>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {bank.map((item) => (
          <TileButton
            key={item.id}
            disabled={item.used}
            onClick={() => handleBankClick(item.id)}
            onPointerDown={
              item.used
                ? undefined
                : startDrag(item.id, item.label, { kind: "bank" })
            }
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={cancelDrag}
            isDragging={
              activeDrag?.source.kind === "bank" && activeDrag.id === item.id
            }
            aria-label={
              item.used
                ? `${item.label} already placed`
                : `Drag ${item.label} to a blank or press to place it in the next empty blank.`
            }
            aria-describedby={statusId}
            className={cn(
              "h-[54px] w-[68px] rounded-[16px] bg-default text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.22)]",
              item.used
                ? "cursor-not-allowed border-white/12 opacity-35"
                : "cursor-grab border-border active:cursor-grabbing active:scale-[0.98]",
            )}
          >
            <span className="leading-none">{item.label}</span>
          </TileButton>
        ))}
      </div>

      {/* Portal the floating ghost to <body> so its `position: fixed` is
          relative to the viewport, not a transformed ancestor (e.g. the
          `practice-stage-in` entrance animation keeps a non-none transform,
          which would otherwise re-anchor the ghost and strand it off-cursor). */}
      {ghostNode ? createPortal(ghostNode, document.body) : null}
    </div>
  );
}
