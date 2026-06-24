import { useEffect, useRef } from "react";
import { Alignment, Fit, Layout, Rive } from "@rive-app/react-webgl2";

import { cn } from "../../lib/cn";
// Side effect: point Rive at the self-hosted wasm before any instance loads.
import "../../lib/rive-runtime";

export interface RivePlayerProps {
  /** Path to the `.riv` asset (served from /public). */
  src: string;
  /** Artboard to render; defaults to the file's default artboard. */
  artboard?: string;
  /** State machine(s) to play. */
  stateMachines?: string | string[];
  /** Animation(s) to play (ignored when `stateMachines` is set). */
  animations?: string | string[];
  fit?: Fit;
  alignment?: Alignment;
  autoplay?: boolean;
  className?: string;
  /** Bind the default ViewModel instance (needed for `viewModelBooleans`). */
  autoBind?: boolean;
  /** ViewModel boolean properties to set on load (data binding, not SM inputs). */
  viewModelBooleans?: Record<string, boolean>;
  /** ViewModel number properties (data binding): set on load and kept in sync. */
  viewModelNumbers?: Record<string, number>;
  /** Receives the live Rive instance once loaded (e.g. to read `.contents`). */
  onRive?: (rive: Rive) => void;
}

/**
 * React wrapper around Rive's WebGL2 runtime. We drive the instance imperatively
 * and keep it in a ref, never in React state or props, because React 19's
 * dev-mode render diffing deep-traverses state/props and would call getters on a
 * cleaned-up (deleted) wasm object, throwing `BindingError`. The instance owns a
 * ResizeObserver so the drawing surface tracks the container (incl. DPR).
 */
export function RivePlayer({
  src,
  artboard,
  stateMachines,
  animations,
  fit = Fit.Contain,
  alignment = Alignment.Center,
  autoplay = true,
  className,
  autoBind,
  viewModelBooleans,
  viewModelNumbers,
  onRive,
}: RivePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riveRef = useRef<Rive | null>(null);
  // Latest-ref pattern: keep the newest callback / binding values without
  // re-creating the Rive instance. Updated in an effect (never during render).
  const onRiveRef = useRef(onRive);
  const vmRef = useRef(viewModelBooleans);
  const vmNumRef = useRef(viewModelNumbers);
  useEffect(() => {
    onRiveRef.current = onRive;
    vmRef.current = viewModelBooleans;
    vmNumRef.current = viewModelNumbers;
  });

  const wantBind =
    autoBind || Boolean(viewModelBooleans) || Boolean(viewModelNumbers);

  // Stable key so the sync effect only runs when a bound number actually changes.
  const numberKey = viewModelNumbers
    ? Object.entries(viewModelNumbers)
        .map(([k, v]) => `${k}:${v}`)
        .join("|")
    : "";

  // Stable primitives so array props don't churn the (re)create effect.
  const stateMachineKey = Array.isArray(stateMachines)
    ? stateMachines.join("|")
    : stateMachines;
  const animationKey = Array.isArray(animations)
    ? animations.join("|")
    : animations;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rive = new Rive({
      src,
      canvas,
      artboard,
      stateMachines,
      animations,
      autoplay,
      autoBind: wantBind,
      useOffscreenRenderer: true,
      layout: new Layout({ fit, alignment }),
      onLoad: () => {
        // Ignore a load that resolves after this instance was torn down
        // (React StrictMode mounts → cleans up → mounts again in dev).
        if (riveRef.current !== rive) return;
        rive.resizeDrawingSurfaceToCanvas();
        // Data binding: set ViewModel boolean + number properties on load.
        const instance = rive.viewModelInstance;
        if (instance) {
          const vm = vmRef.current;
          if (vm) {
            for (const [name, value] of Object.entries(vm)) {
              const prop = instance.boolean(name);
              if (prop) prop.value = value;
            }
          }
          const nums = vmNumRef.current;
          if (nums) {
            for (const [name, value] of Object.entries(nums)) {
              const prop = instance.number(name);
              if (prop) prop.value = value;
            }
          }
        }
        onRiveRef.current?.(rive);
      },
    });
    riveRef.current = rive;

    const observer = new ResizeObserver(() => {
      riveRef.current?.resizeDrawingSurfaceToCanvas();
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      rive.cleanup();
      if (riveRef.current === rive) riveRef.current = null;
    };
    // fit/alignment are applied in the effect below without re-creating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, artboard, stateMachineKey, animationKey, autoplay, wantBind]);

  // Apply Fit/Alignment changes to the live instance (no re-create).
  useEffect(() => {
    if (riveRef.current) riveRef.current.layout = new Layout({ fit, alignment });
  }, [fit, alignment]);

  // Keep bound numbers (e.g. the streak count) in sync without re-creating.
  useEffect(() => {
    const instance = riveRef.current?.viewModelInstance;
    const nums = vmNumRef.current;
    if (!instance || !nums) return;
    for (const [name, value] of Object.entries(nums)) {
      const prop = instance.number(name);
      if (prop) prop.value = value;
    }
  }, [numberKey]);

  return (
    <div className={cn("relative", className)}>
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}
