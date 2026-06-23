import { forwardRef, useId, useRef, useState } from "react";
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
  hasMoved: boolean;
};

const DRAG_THRESHOLD_PX = 6;
const DROP_MAGNET_PX = 18;

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
        overBlank: findBlankAtPoint(event.clientX, event.clientY),
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
      hasMoved: drag.hasMoved || movedEnough(drag, event.clientX, event.clientY),
    };
    setActiveDrag(nextDrag);
    setDragStatus(
      overBlank === null
        ? `Dragging ${drag.label}.`
        : `Dragging ${drag.label} over blank ${overBlank + 1}.`,
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

  return (
    <div className={cn("relative isolate flex flex-col items-center gap-9", className)}>
      <p id={statusId} className="sr-only" aria-live="polite">
        {dragStatus}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 text-4xl font-bold text-foreground sm:gap-5 sm:text-5xl">
        {parts.map((part, i) => {
          if (part !== null) {
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
                "h-20 w-32 rounded-[18px] sm:h-28 sm:w-40 sm:rounded-[22px]",
                value
                  ? "border-accent bg-accent/10 text-4xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_36px_rgba(69,109,255,0.08)]"
                  : "border-dashed border-white/30 bg-transparent text-transparent",
                !value && !isDropTarget && "shadow-none",
                isDropTarget &&
                  "scale-[1.025] border-accent bg-accent/15 shadow-[0_0_0_1px_rgba(69,109,255,0.55),0_18px_55px_rgba(69,109,255,0.16)]",
              )}
            >
              <span className="leading-none">{value ?? ""}</span>
            </TileButton>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
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
              "h-[72px] min-w-[86px] rounded-[18px] bg-default px-6 text-4xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.22)] sm:h-24 sm:min-w-[104px] sm:rounded-[20px] sm:px-8",
              item.label.length > 2 && "min-w-[112px] sm:min-w-[136px]",
              item.used
                ? "cursor-not-allowed border-white/12 opacity-35"
                : "cursor-grab border-border active:cursor-grabbing active:scale-[0.98]",
            )}
          >
            <span className="leading-none">{item.label}</span>
          </TileButton>
        ))}
      </div>

      {activeDrag ? (
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-50 flex items-center justify-center rounded-[20px] border-4 border-accent bg-surface px-8 text-4xl font-bold text-foreground shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,255,255,0.08)] will-change-transform motion-reduce:transition-none"
          style={{
            width: activeDrag.width,
            height: activeDrag.height,
            transformOrigin: `${activeDrag.pointerOffsetX}px ${activeDrag.pointerOffsetY}px`,
            transform: `translate3d(${activeDrag.x - activeDrag.pointerOffsetX}px, ${
              activeDrag.y - activeDrag.pointerOffsetY
            }px, 0) scale(1.06)`,
          }}
        >
          <span className="leading-none">{activeDrag.label}</span>
        </div>
      ) : null}
    </div>
  );
}
