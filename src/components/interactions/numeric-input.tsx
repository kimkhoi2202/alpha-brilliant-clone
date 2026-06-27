import { useEffect, useState } from "react";
import type { RefObject } from "react";

import type {
  CanvasColor,
  CanvasComponentHandle,
  CanvasTarget,
} from "../../lib/ai/tools/canvas";
import { cn } from "../../lib/cn";
import { StateBadge } from "../ui/state-badge";

/** One Koji annotation on a target: a border tint, a tag, and/or a pulse. */
type CanvasAnnotation = { color?: CanvasColor; label?: string; point?: boolean };

/** Map the contract's pedagogical colors onto the app's theme tokens. */
const CANVAS_COLOR_VAR: Record<CanvasColor, string> = {
  accent: "var(--accent)",
  warning: "var(--warning)",
  success: "var(--success)",
  danger: "var(--danger)",
  muted: "var(--muted)",
};

/**
 * The one part Koji can address on this figure: the answer field itself (the
 * runtime source of truth for listTargets, mirrored into `canvasTargetsFor` at
 * the host). A single free-entry field has no sub-parts, so there is exactly one
 * target whose role is "answer-field".
 */
const ANSWER_FIELD_ID = "answer-field";
const ANSWER_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: ANSWER_FIELD_ID, role: "answer-field", label: "answer" },
];

export interface NumericInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Graded styling: green + ✓ when correct, gold + ✕ when wrong. */
  state?: "default" | "correct" | "incorrect";
  /** Fires on Enter (lets the player grade with the keyboard). */
  onEnter?: () => void;
  /**
   * Koji's canvas handle sink (the `KojiReactions` pattern). When provided, the
   * component publishes its `CanvasComponentHandle` here so the host's
   * `LessonCanvas` can highlight / label / point at the answer field. Omit (or
   * pass undefined) and the component is byte-for-byte its old self — no handle,
   * no annotations. Prefill is host-owned (the contract's `prefillAnswer`), so
   * this component never sets the value itself.
   */
  canvasRef?: RefObject<CanvasComponentHandle | null>;
}

/** Numeric answer entry: 18px+ to avoid iOS zoom; decimal keypad on mobile. */
export function NumericInput({
  value,
  onChange,
  unit,
  placeholder = "?",
  disabled,
  state = "default",
  onEnter,
  canvasRef,
}: NumericInputProps) {
  // Koji's annotation (highlight / label / point), keyed by target id like the
  // triangle reference. Additive overlay only — the <input> below is never
  // touched, so an un-annotated (AI-off) field renders identically to before.
  const [annotations, setAnnotations] = useState<Record<string, CanvasAnnotation>>(
    {},
  );

  const graded = state !== "default";
  // Once graded (or disabled by the parent) the field is locked: it must be
  // fully inert — no typing, no Enter, no focus, and no mouse-wheel spinning —
  // while still showing the submitted value and its graded styling.
  const locked = graded || !!disabled;

  // Publish the canvas handle so Koji's tools can drive the field. Visual ops
  // are pure setState (read back at render time from `annotations`), so the
  // handle is stable and only re-published if the sink ref changes. The host
  // clears annotations on step change and the cleanup nulls the ref on unmount,
  // so highlights never leak across steps.
  useEffect(() => {
    if (!canvasRef) return;
    const handle: CanvasComponentHandle = {
      listTargets: () => ANSWER_CANVAS_TARGETS.map((target) => ({ ...target })),
      highlight: (targetId, opts) =>
        setAnnotations((prev) => ({
          ...prev,
          [targetId]: {
            ...prev[targetId],
            color: opts?.color ?? prev[targetId]?.color ?? "accent",
            ...(opts?.label !== undefined ? { label: opts.label } : {}),
          },
        })),
      label: (targetId, text) =>
        setAnnotations((prev) => ({
          ...prev,
          [targetId]: { ...prev[targetId], label: text },
        })),
      point: (targetId) =>
        setAnnotations((prev) => ({
          ...prev,
          [targetId]: {
            ...prev[targetId],
            point: true,
            color: prev[targetId]?.color ?? "accent",
          },
        })),
      clear: () => setAnnotations({}),
    };
    canvasRef.current = handle;
    return () => {
      if (canvasRef.current === handle) canvasRef.current = null;
    };
  }, [canvasRef]);

  // The single answer-field annotation (absent until Koji draws on it). The
  // border emphasis stands down once the field is graded so it never paints over
  // the green ✓ / gold ✕ verdict — the contract's "never disturbs grading."
  const ann = annotations[ANSWER_FIELD_ID];
  const annColorVar = CANVAS_COLOR_VAR[ann?.color ?? "accent"];
  const showBorder = !graded && (ann?.color !== undefined || ann?.point === true);

  return (
    <div className="flex items-center justify-center gap-3">
      <div className="relative">
        {/* Koji's tag — a small caption above the field (additive, never touches
            the input). Tinted to match the highlight; "muted" stays low-key. */}
        {ann?.label ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold"
            style={{
              color: annColorVar,
              borderColor: annColorVar,
              backgroundColor: `color-mix(in srgb, ${annColorVar} 20%, var(--background))`,
            }}
          >
            {ann.label}
          </span>
        ) : null}
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          readOnly={locked}
          tabIndex={locked ? -1 : undefined}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(event) => {
            if (locked) return;
            const raw = event.target.value.trim();
            if (raw === "") return onChange(null);
            const parsed = Number(raw);
            onChange(Number.isNaN(parsed) ? null : parsed);
          }}
          onKeyDown={(event) => {
            if (locked) return;
            // Ignore auto-repeat (held Enter) so a single press grades only once.
            if (event.key === "Enter" && !event.repeat) onEnter?.();
          }}
          onWheel={(event) => {
            // A focused number field can be spun by the mouse wheel; once locked,
            // drop focus so scrolling over the answer never changes its value.
            if (locked) event.currentTarget.blur();
          }}
          className={cn(
            "w-32 rounded-xl border bg-surface px-4 py-3.5 text-center text-3xl font-bold text-foreground outline-none transition-colors",
            // The "?" hint clears once the field is active so it doesn't sit
            // under the caret.
            "placeholder:text-muted focus:placeholder:text-transparent",
            // Graded states keep full opacity (a correct answer shouldn't look
            // dimmed) and swap the border/tint for the green ✓ / gold ✕ cue.
            state === "default" &&
              "border-border focus:border-accent disabled:opacity-60",
            state === "correct" && "border-success bg-success/15",
            state === "incorrect" && "border-warning bg-warning/15",
          )}
          aria-label="Your answer"
        />
        {/* Koji's border emphasis — an additive overlay tracing the input's edge
            (border-color only; deliberately NO ring/glow halo). Pulses via
            koji-canvas-pulse when pointed at; reduced motion settles it to a
            steady border. Transparent center + pointerEvents none, so the value
            stays solid and typing/focus on the input below is unaffected. */}
        {showBorder ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 rounded-xl border-2",
              ann?.point ? "koji-canvas-pulse" : undefined,
            )}
            style={{ borderColor: annColorVar }}
          />
        ) : null}
        {graded ? <StateBadge state={state} /> : null}
      </div>
      {unit ? <span className="text-xl text-muted">{unit}</span> : null}
    </div>
  );
}
