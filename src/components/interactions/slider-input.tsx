import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  animate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";

import type {
  CanvasColor,
  CanvasComponentHandle,
  CanvasTarget,
} from "../../lib/ai/tools/canvas";
import { cn } from "../../lib/cn";

/** One Koji annotation on a target: a tint, a tag, and/or an attention pulse. */
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
 * The parts Koji can address on the slider: the whole control, the rail, and the
 * draggable thumb. Short stable kebab-case ids; the same list is mirrored into
 * `canvasTargetsFor` centrally so the runtime handle and the agent grounding can
 * never drift.
 */
const SLIDER_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: "slider", role: "slider", label: "the slider" },
  { id: "slider-track", role: "track", label: "the track" },
  { id: "slider-handle", role: "handle", label: "the handle" },
];

/**
 * Per target: which part a `highlight` tints, and which part a `label` / `point`
 * anchors to. `slider` is the whole control — tint the rail, but point at / tag
 * the thumb (the natural "drag this" gesture).
 */
type SliderPart = "track" | "handle";
const SLIDER_TARGET_CONFIG: Record<
  string,
  { highlight: SliderPart; anchor: SliderPart }
> = {
  slider: { highlight: "track", anchor: "handle" },
  "slider-track": { highlight: "track", anchor: "track" },
  "slider-handle": { highlight: "handle", anchor: "handle" },
};

export interface SliderInputProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  disabled?: boolean;
  /** Optional caption for the control (e.g. "Base"). */
  label?: string;
  /**
   * Slim single-row layout (label · track · value) for dense surfaces such as
   * the hero playground, instead of the default big centred readout.
   */
  compact?: boolean;
  /**
   * Koji's canvas handle sink (the `KojiReactions` pattern). When provided, the
   * component publishes its `CanvasComponentHandle` here so the host's
   * `LessonCanvas` can highlight / label / point at the slider's track and
   * handle. Omit (or pass undefined) and the component is byte-for-byte its old
   * self — no handle, no annotations.
   */
  canvasRef?: RefObject<CanvasComponentHandle | null>;
}

/**
 * Spring tuning for the thumb press/release (Apple's duration + bounce model).
 *
 * Press is snappy and critically damped (bounce 0 → no undershoot) so the thumb
 * feels physically pushed the instant you touch it (~0.9, settles ~200ms).
 * Release returns to 1 with a small, tasteful overshoot — the "pop" that reads
 * as premium (Stripe/Linear) without wobbling. Because the travel is only ~0.1,
 * even bounce 0.5 peaks at just ~1.016 (a ~1.6% overshoot at ~240ms, fully
 * settled by ~460ms): perceptible, never cartoonish. (Values measured against
 * Motion's own spring generator.)
 */
const PRESSED_SCALE = 0.9;
const PRESS_SPRING = { type: "spring", visualDuration: 0.13, bounce: 0 } as const;
const RELEASE_SPRING = {
  type: "spring",
  visualDuration: 0.34,
  bounce: 0.5,
} as const;

/** Slider with a big live readout: adjust and watch the value respond. */
export function SliderInput({
  min,
  max,
  step,
  value,
  onChange,
  unit,
  disabled,
  label,
  compact = false,
  canvasRef,
}: SliderInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPressedRef = useRef(false);
  // Source of truth for the thumb scale. A single MotionValue means a press
  // that interrupts an in-flight release (or vice-versa) carries its velocity
  // across, so rapid tap/drag never snaps or stutters.
  const thumbScale = useMotionValue(1);
  const reduceMotion = useReducedMotion();

  // Koji's annotations (highlight / label / point), keyed by target id. Additive
  // overlay only — never disturbs the slider's value or press behavior below.
  const [annotations, setAnnotations] = useState<Record<string, CanvasAnnotation>>(
    {},
  );

  // Publish the canvas handle so Koji's tools can drive the slider. Visual ops
  // are pure setState (geometry is read at render time from `annotations` and the
  // live value), so the handle is stable and only re-published if the sink ref
  // changes. The host clears annotations on step change and the cleanup nulls the
  // ref on unmount, so highlights never leak across steps.
  useEffect(() => {
    if (!canvasRef) return;
    const handle: CanvasComponentHandle = {
      listTargets: () => SLIDER_CANVAS_TARGETS.map((target) => ({ ...target })),
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
          [targetId]: { ...prev[targetId], point: true },
        })),
      clear: () => setAnnotations({}),
    };
    canvasRef.current = handle;
    return () => {
      if (canvasRef.current === handle) canvasRef.current = null;
    };
  }, [canvasRef]);

  // Mirror the spring onto the input's `--thumb-scale` each frame via a direct
  // DOM write (never React state) so animating the thumb never triggers a
  // re-render. The thumb pseudo-element reads the variable (see globals.css).
  useMotionValueEvent(thumbScale, "change", (latest) => {
    inputRef.current?.style.setProperty("--thumb-scale", String(latest));
  });

  const pressThumb = useCallback(() => {
    if (reduceMotion) return;
    isPressedRef.current = true;
    animate(thumbScale, PRESSED_SCALE, PRESS_SPRING);
  }, [reduceMotion, thumbScale]);

  const releaseThumb = useCallback(() => {
    // Guard against stray/duplicate releases (e.g. pointerup *and* blur firing
    // for one press) so we don't restart the spring needlessly.
    if (!isPressedRef.current) return;
    isPressedRef.current = false;
    if (reduceMotion) return;
    animate(thumbScale, 1, RELEASE_SPRING);
  }, [reduceMotion, thumbScale]);

  // Koji overlay geometry. The native range thumb is inset by half its width (the
  // 18px disc in globals.css), so its centre travels from 9px to (100% − 9px);
  // place handle annotations at that exact centre. Track annotations span the rail.
  const span = max - min;
  const frac = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
  const handleLeft = `calc(${(frac * 100).toFixed(3)}% + ${(9 - frac * 18).toFixed(
    3,
  )}px)`;
  const annotationEntries = Object.entries(annotations);

  // Koji's annotation overlay (only present once Koji has drawn something):
  // additive, pointer-events-none, drawn above the rail so the slider still drags.
  const overlay =
    annotationEntries.length > 0 ? (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {annotationEntries.map(([targetId, ann]) => {
          const cfg = SLIDER_TARGET_CONFIG[targetId];
          if (!cfg) return null;
          const colorVar = CANVAS_COLOR_VAR[ann.color ?? "accent"];
          const hasColor = ann.color !== undefined;
          const pointing = ann.point === true;
          const trackEmphasis = cfg.highlight === "track" && hasColor;
          const trackPulse = cfg.anchor === "track" && pointing;
          const handleEmphasis = cfg.highlight === "handle" && hasColor;
          const handlePulse = cfg.anchor === "handle" && pointing;
          const anchorLeft = cfg.anchor === "handle" ? handleLeft : "50%";
          return (
            <div key={targetId}>
              {trackEmphasis || trackPulse ? (
                <div
                  className={cn(
                    "absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full border-2",
                    trackPulse ? "koji-canvas-pulse" : undefined,
                  )}
                  style={{
                    borderColor: colorVar,
                    background: `color-mix(in srgb, ${colorVar} 22%, transparent)`,
                  }}
                />
              ) : null}
              {handleEmphasis || handlePulse ? (
                <div
                  className={cn(
                    "absolute rounded-full border-2",
                    handlePulse ? "koji-canvas-pulse" : undefined,
                  )}
                  style={{
                    left: handleLeft,
                    top: "50%",
                    height: 18,
                    width: 18,
                    transform: "translate(-50%, -50%)",
                    borderColor: colorVar,
                    background: `color-mix(in srgb, ${colorVar} 30%, transparent)`,
                  }}
                />
              ) : null}
              {ann.label ? (
                <span
                  className="absolute whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold"
                  style={{
                    left: anchorLeft,
                    bottom: "calc(100% + 8px)",
                    transform: "translateX(-50%)",
                    borderColor: colorVar,
                    background: `color-mix(in srgb, ${colorVar} 18%, var(--background))`,
                    color: colorVar,
                  }}
                >
                  {ann.label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    ) : null;

  const track = (
    <div className={cn("relative", compact ? "min-w-0 flex-1" : "w-full")}>
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        // Pointer is the priority: hold → shrink, release (anywhere) → spring back.
        // Range inputs capture the pointer while dragging, so pointerup /
        // lostpointercapture fire on the input even when the finger ends up off
        // the thumb; blur is a final safety for focus loss mid-press.
        onPointerDown={pressThumb}
        onPointerUp={releaseThumb}
        onPointerCancel={releaseThumb}
        onLostPointerCapture={releaseThumb}
        onBlur={releaseThumb}
        className="alpha-slider h-[18px] w-full cursor-pointer appearance-none bg-transparent disabled:opacity-60"
        style={{ accentColor: "var(--accent)" }}
        aria-label={label ?? "Adjust value"}
        aria-valuetext={`${value}${unit ? ` ${unit}` : ""}`}
      />
      {overlay}
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {label ? (
          <span className="w-12 shrink-0 text-sm font-medium text-muted">
            {label}
          </span>
        ) : null}
        {track}
        <span className="w-9 shrink-0 text-right text-base font-bold tabular-nums text-foreground">
          {value}
          {unit ? <span className="ml-0.5 text-muted">{unit}</span> : null}
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
      {label ? (
        <span className="text-sm font-medium text-muted">{label}</span>
      ) : null}
      <div className="text-4xl font-extrabold tabular-nums text-foreground">
        {value}
        {unit ? <span className="ml-1 text-xl text-muted">{unit}</span> : null}
      </div>
      {track}
      <div className="flex w-full justify-between text-xs tabular-nums text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
