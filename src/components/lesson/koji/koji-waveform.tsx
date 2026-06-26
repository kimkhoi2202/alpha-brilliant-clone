/**
 * `KojiWaveform` — a tiny live audio meter for the in-lesson voice row.
 *
 * It shows the learner's own microphone level so they can *see* that audio is
 * connected while talking to Koji. The visual is five rounded, centre-anchored
 * bars whose heights track the mic level in real time.
 *
 * Audio source: a **dedicated** `getUserMedia({ audio: true })` stream rather
 * than the realtime transport's track. The SDK's `RealtimeTransportLayer` type
 * doesn't cleanly expose the peer connection / local track, so reaching for it
 * would mean a fragile cast; a dedicated stream is robust and — because the live
 * session has already been granted the mic — opening it never re-prompts. The
 * stream is only ever opened once the session is live AND the mic is open, so the
 * panel never triggers an early permission prompt.
 *
 * Performance: the RAF loop writes bar heights straight to the DOM via refs
 * (never React state), so 60fps animation costs zero re-renders. When connected
 * but not capturing it shows a gentle "breathing" sine so it always looks alive;
 * when disconnected it holds a calm static shape. `prefers-reduced-motion` holds
 * still. The stream, AnalyserNode, AudioContext, and RAF are all torn down on
 * unmount and whenever capture stops.
 */
import { useEffect, useRef } from "react";

import { cn } from "../../../lib/cn";

const BAR_COUNT = 5;
/** Floor so bars never fully collapse — they read as a meter even when quiet. */
const MIN_SCALE = 0.16;
/** Gain applied to the normalized mic level so ordinary speech fills the bars. */
const MIC_GAIN = 1.9;
/** Symmetric band map: the centre bar carries the strongest (low-freq) energy. */
const BAND_FOR_BAR = [2, 1, 0, 1, 2] as const;
/** Symmetric phase offsets so the idle breathing reads as centre-anchored. */
const BREATHE_PHASE = [0, 0.5, 1, 0.5, 0] as const;
/** Calm resting shape used when disconnected / under reduced motion. */
const STATIC_LEVELS = [0.28, 0.5, 0.7, 0.5, 0.28];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Write a per-bar level (0–1) to the DOM as a centre-anchored `scaleY`. */
function applyLevels(bars: (HTMLSpanElement | null)[], levels: number[]): void {
  for (let i = 0; i < bars.length; i++) {
    const el = bars[i];
    if (!el) continue;
    const lvl = Math.max(0, Math.min(1, levels[i] ?? 0));
    const scale = MIN_SCALE + (1 - MIN_SCALE) * lvl;
    el.style.transform = `scaleY(${scale.toFixed(3)})`;
  }
}

/** Project the analyser's frequency data into five symmetric bar levels. */
function micLevels(data: Uint8Array): number[] {
  // Voice energy concentrates in the lower spectrum; use the lower ~60%.
  const usable = Math.max(3, Math.floor(data.length * 0.6));
  const bandSize = Math.max(1, Math.floor(usable / 3));
  const bands = [0, 0, 0];
  for (let b = 0; b < 3; b++) {
    let sum = 0;
    for (let j = 0; j < bandSize; j++) sum += data[b * bandSize + j] ?? 0;
    bands[b] = sum / bandSize / 255;
  }
  return BAND_FOR_BAR.map((b) => (bands[b] ?? 0) * MIC_GAIN);
}

/** Gentle sine "breathing" used when connected but not actively capturing. */
function breatheLevels(t: number): number[] {
  return BREATHE_PHASE.map((p) => ((Math.sin(t * 2.2 + p) + 1) / 2) * 0.4 + 0.12);
}

export interface KojiWaveformProps {
  /** Capturing the learner (session live AND mic open) — show real levels. */
  listening: boolean;
  /** Session is connected — drives breathing (vs. dormant) when not capturing. */
  connected: boolean;
  className?: string;
}

export function KojiWaveform({ listening, connected, className }: KojiWaveformProps) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const reducedRef = useRef(prefersReducedMotion());

  useEffect(() => {
    const bars = barsRef.current;

    // Reduced motion: hold a calm static shape, no audio, no RAF.
    if (reducedRef.current) {
      applyLevels(bars, STATIC_LEVELS);
      return;
    }

    let cancelled = false;
    let raf = 0;
    let cleanupAudio: (() => void) | null = null;

    const runBreathing = () => {
      const start = performance.now();
      const loop = (now: number) => {
        if (cancelled) return;
        applyLevels(bars, breatheLevels((now - start) / 1000));
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };

    if (listening && connected) {
      // Real mic levels via a dedicated stream (already granted → no re-prompt).
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          const Ctor =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext;
          if (!Ctor) {
            stream.getTracks().forEach((t) => t.stop());
            runBreathing();
            return;
          }
          const audioCtx = new Ctor();
          void audioCtx.resume();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          // Intentionally NOT connected to the destination — no mic playback.
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          cleanupAudio = () => {
            try {
              source.disconnect();
            } catch {
              // Already disconnected; ignore.
            }
            stream.getTracks().forEach((t) => t.stop());
            void audioCtx.close();
          };
          const loop = () => {
            if (cancelled) return;
            analyser.getByteFrequencyData(data);
            applyLevels(bars, micLevels(data));
            raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
        })
        .catch(() => {
          // Mic unavailable for the meter — keep it alive with breathing.
          if (!cancelled) runBreathing();
        });
    } else if (connected) {
      runBreathing();
    } else {
      applyLevels(bars, STATIC_LEVELS);
    }

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (cleanupAudio) cleanupAudio();
    };
  }, [listening, connected]);

  const tone = listening
    ? "bg-accent"
    : connected
      ? "bg-accent/70"
      : "bg-muted/60";

  return (
    <div
      aria-hidden
      className={cn(
        "flex h-12 items-center justify-center gap-[3px] rounded-full border border-border bg-surface/60 px-4",
        className,
      )}
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className={cn(
            "h-6 w-[3px] origin-center rounded-full transition-colors duration-300 motion-reduce:transition-none",
            tone,
          )}
          style={{ transform: `scaleY(${MIN_SCALE})` }}
        />
      ))}
    </div>
  );
}
