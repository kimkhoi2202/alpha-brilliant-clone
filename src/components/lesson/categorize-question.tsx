import { useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { cn } from "../../lib/cn";
import { AnswerChip, type AnswerChipState } from "./answer-chip";

export interface CategorizeBin {
  id: string;
  label: string;
}

export interface CategorizeItem {
  id: string;
  label: string;
}

/** Grading lifecycle, mirroring the lesson runner's StepPhase. */
export type CategorizePhase = "answering" | "correct" | "wrong" | "revealed";

export interface CategorizeQuestionProps {
  bins: CategorizeBin[];
  items: CategorizeItem[];
  /** itemId → binId (or null while still in the tray). Controlled. */
  placement: Record<string, string | null>;
  /** itemId → correct binId; tints chips once graded. */
  correctBinByItem?: Record<string, string>;
  phase: CategorizePhase;
  onChange: (itemId: string, binId: string | null) => void;
  className?: string;
}

type DragSource = { kind: "tray" } | { kind: "bin"; binId: string };

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
  overBin: string | null;
  hasMoved: boolean;
};

const DRAG_THRESHOLD_PX = 6;
const DROP_MAGNET_PX = 16;

function movedEnough(drag: ActiveDrag, x: number, y: number) {
  return Math.hypot(x - drag.startX, y - drag.startY) >= DRAG_THRESHOLD_PX;
}

/**
 * Sort items into labeled bins. The primary interaction is dragging a chip into
 * a bin (pointer-based, so it works with both mouse and touch); a tap fallback
 * remains for keyboard/assistive use: tap an item to select it, then tap a bin.
 * Tap a placed chip (or drag it out) to send it back. Once graded, chips tint
 * green/gold against their correct bin so a wrong sort still shows the right home.
 */
export function CategorizeQuestion({
  bins,
  items,
  placement,
  correctBinByItem,
  phase,
  onChange,
  className,
}: CategorizeQuestionProps) {
  const statusId = useId();
  const locked = phase !== "answering";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const binRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const [activeDrag, setActiveDragState] = useState<ActiveDrag | null>(null);
  const suppressNextClickRef = useRef(false);

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
  const consumeClick = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return true;
    }
    return false;
  };

  const labelOf = (id: string) => items.find((it) => it.id === id)?.label ?? id;
  const unplaced = items.filter((it) => placement[it.id] == null);

  const findBinAtPoint = (x: number, y: number): string | null => {
    let best: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const bin of bins) {
      const node = binRefs.current[bin.id];
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      const insideMagnet =
        x >= rect.left - DROP_MAGNET_PX &&
        x <= rect.right + DROP_MAGNET_PX &&
        y >= rect.top - DROP_MAGNET_PX &&
        y <= rect.bottom + DROP_MAGNET_PX;
      if (!insideMagnet) continue;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(x - centerX, y - centerY);
      if (distance < bestDistance) {
        best = bin.id;
        bestDistance = distance;
      }
    }
    return best;
  };

  const startDrag =
    (id: string, label: string, source: DragSource) =>
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (locked) return;
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
        overBin: findBinAtPoint(event.clientX, event.clientY),
        hasMoved: false,
      });
      setStatus(`Dragging ${label}. Move over a bin and release.`);
    };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = activeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setActiveDrag({
      ...drag,
      x: event.clientX,
      y: event.clientY,
      overBin: findBinAtPoint(event.clientX, event.clientY),
      hasMoved: drag.hasMoved || movedEnough(drag, event.clientX, event.clientY),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = activeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* Ignore browsers without pointer-capture state. */
    }
    const moved = drag.hasMoved || movedEnough(drag, event.clientX, event.clientY);
    const target = findBinAtPoint(event.clientX, event.clientY);
    if (moved) suppressNextClick();
    setActiveDrag(null);
    if (!moved) return; // A tap: let the click handlers act.
    if (target != null) {
      onChange(drag.id, target);
      setSelectedId(null);
      const bin = bins.find((b) => b.id === target);
      setStatus(`${drag.label} placed in ${bin?.label ?? "bin"}.`);
    } else if (drag.source.kind === "bin") {
      onChange(drag.id, null);
      setStatus(`${drag.label} returned to the tray.`);
    }
  };

  const cancelDrag = () => {
    if (activeDragRef.current?.hasMoved) suppressNextClick();
    setActiveDrag(null);
  };

  // --- Tap fallback (keyboard / assistive) -------------------------------------
  const tapTrayItem = (id: string) => {
    if (locked || consumeClick()) return;
    setSelectedId((cur) => (cur === id ? null : id));
  };
  const tapBin = (binId: string) => {
    if (locked || consumeClick() || !selectedId) return;
    const movedId = selectedId;
    onChange(movedId, binId);
    setSelectedId(null);
    const bin = bins.find((b) => b.id === binId);
    setStatus(`${labelOf(movedId)} placed in ${bin?.label ?? "bin"}.`);
  };
  const tapPlaced = (id: string) => {
    if (locked || consumeClick()) return;
    onChange(id, null);
    setSelectedId(id);
    setStatus(`${labelOf(id)} returned to the tray.`);
  };

  const chipState = (itemId: string, binId: string): AnswerChipState => {
    if (!locked || !correctBinByItem) return "default";
    return correctBinByItem[itemId] === binId ? "correct" : "incorrect";
  };

  const dragHandlers = (id: string, label: string, source: DragSource) => ({
    onPointerDown: locked ? undefined : startDrag(id, label, source),
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: cancelDrag,
    draggable: false,
    onDragStart: (event: { preventDefault: () => void }) =>
      event.preventDefault(),
  });

  const chipClass = (id: string) =>
    cn(
      "touch-none select-none [-webkit-user-drag:none]",
      !locked && "cursor-grab active:cursor-grabbing",
      activeDrag?.id === id && "opacity-30",
    );

  const canTapPlace = !locked && selectedId != null;

  return (
    <div className={cn("mx-auto flex w-full max-w-md flex-col gap-5", className)}>
      <p id={statusId} className="sr-only" aria-live="polite">
        {status}
      </p>

      {/* Tray of unsorted items. */}
      <div className="rounded-2xl bg-surface/40 p-3">
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">
          {unplaced.length ? "Drag each item into a bin" : "All sorted"}
        </p>
        <div className="flex min-h-11 flex-wrap items-center gap-2">
          {unplaced.map((it) => (
            <AnswerChip
              key={it.id}
              state={selectedId === it.id ? "selected" : "default"}
              disabled={locked}
              onPress={() => tapTrayItem(it.id)}
              {...dragHandlers(it.id, it.label, { kind: "tray" })}
              className={chipClass(it.id)}
              aria-describedby={statusId}
            >
              {it.label}
            </AnswerChip>
          ))}
          {unplaced.length === 0 ? (
            <span className="px-1 text-sm text-muted">Every item is in a bin.</span>
          ) : null}
        </div>
      </div>

      {/* Bins (drop targets). */}
      <div
        className={cn(
          "grid gap-3",
          bins.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3",
        )}
      >
        {bins.map((bin) => {
          const placed = items.filter((it) => placement[it.id] === bin.id);
          const over = activeDrag?.overBin === bin.id;
          return (
            <div
              key={bin.id}
              ref={(node) => {
                binRefs.current[bin.id] = node;
              }}
              className={cn(
                "flex min-h-[7.5rem] flex-col gap-2 rounded-2xl border-2 bg-background p-2.5 transition-colors",
                over ? "border-accent bg-accent/10" : "border-border",
              )}
            >
              <button
                type="button"
                disabled={!canTapPlace}
                onClick={() => tapBin(bin.id)}
                aria-label={
                  canTapPlace
                    ? `Place ${labelOf(selectedId!)} in ${bin.label}`
                    : bin.label
                }
                className={cn(
                  "rounded-xl px-3 py-2 text-left text-sm font-bold text-foreground transition-colors",
                  canTapPlace
                    ? "cursor-pointer bg-surface hover:bg-accent/10"
                    : "cursor-default",
                )}
              >
                {bin.label}
              </button>
              <div className="flex min-h-9 flex-wrap content-start gap-2 px-1 pb-1">
                {placed.map((it) => (
                  <AnswerChip
                    key={it.id}
                    state={chipState(it.id, bin.id)}
                    disabled={locked}
                    onPress={() => tapPlaced(it.id)}
                    {...dragHandlers(it.id, it.label, { kind: "bin", binId: bin.id })}
                    className={chipClass(it.id)}
                    aria-describedby={statusId}
                  >
                    {it.label}
                  </AnswerChip>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating drag preview. */}
      {activeDrag ? (
        <div
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-50 inline-flex items-center justify-center rounded-lg border border-accent bg-surface px-3 py-1.5 font-semibold text-foreground shadow-[0_18px_50px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.06)] will-change-transform"
          style={{
            minWidth: activeDrag.width,
            height: activeDrag.height,
            transform: `translate3d(${activeDrag.x - activeDrag.pointerOffsetX}px, ${
              activeDrag.y - activeDrag.pointerOffsetY
            }px, 0) scale(1.04)`,
          }}
        >
          {activeDrag.label}
        </div>
      ) : null}
    </div>
  );
}
