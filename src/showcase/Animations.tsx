import { useCallback, useRef, useState } from "react";
import { Spinner } from "@heroui/react";
import {
  Fit,
  type Rive,
  type StateMachineInput,
  StateMachineInputType,
} from "@rive-app/react-webgl2";

import { Button, Callout, Chip } from "../components/ui";
import { RivePlayer } from "../components/visuals";
import { cn } from "../lib/cn";
import {
  type RiveAsset,
  type RivePreset,
  RIVE_ASSETS,
  RIVE_RUNTIME_VERSION,
  RIVE_WASM_SOURCE,
  RIVE_WASM_URL,
} from "../lib/rive-runtime";
import { DevTopNav } from "./DevTopNav";
import { Section } from "./Section";

// Indexed-access types so we don't depend on Rive exporting its content interfaces.
type RiveContents = NonNullable<Rive["contents"]>;
type ArtboardContents = NonNullable<RiveContents["artboards"]>[number];
type SmInputContents =
  ArtboardContents["stateMachines"][number]["inputs"][number];
type PlayTarget = { kind: "sm" | "anim"; name: string };

type StageBg = "charcoal" | "light" | "checker";

const STAGE_BG_CLASS: Record<StageBg, string> = {
  charcoal: "bg-background",
  light: "bg-[#e9e9ee]",
  checker: "",
};

const CHECKER_STYLE: React.CSSProperties = {
  backgroundColor: "#b6b6bc",
  backgroundImage:
    "linear-gradient(45deg,#8c8c92 25%,transparent 25%),linear-gradient(-45deg,#8c8c92 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#8c8c92 75%),linear-gradient(-45deg,transparent 75%,#8c8c92 75%)",
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
};

const BG_OPTIONS: { value: StageBg; label: string }[] = [
  { value: "charcoal", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "checker", label: "Checker" },
];

const FIT_OPTIONS: { value: Fit; label: string }[] = [
  { value: Fit.Contain, label: "Contain" },
  { value: Fit.Cover, label: "Cover" },
  { value: Fit.Fill, label: "Fill" },
];

function inputTypeLabel(type: StateMachineInputType): string {
  switch (type) {
    case StateMachineInputType.Boolean:
      return "boolean";
    case StateMachineInputType.Number:
      return "number";
    case StateMachineInputType.Trigger:
      return "trigger";
    default:
      return "input";
  }
}

function SegToggle<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            o.value === value
              ? "bg-default text-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[220px] rounded-lg border border-border bg-surface px-2 py-1 text-foreground"
      >
        {children}
      </select>
    </label>
  );
}

function Stage({
  bg,
  loaded,
  className,
  children,
}: {
  bg: StageBg;
  loaded: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border",
        STAGE_BG_CLASS[bg],
        className,
      )}
      style={bg === "checker" ? CHECKER_STYLE : undefined}
    >
      {children}
      {!loaded ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Spinner />
        </div>
      ) : null}
    </div>
  );
}

/**
 * One control bound to a state-machine input. The live input is resolved
 * lazily via `resolve()` inside event handlers: the Rive object is never held
 * in React state/props (which React 19 dev mode would deep-diff and crash on).
 */
function InputControl({
  input,
  resolve,
}: {
  input: SmInputContents;
  resolve: () => StateMachineInput | null;
}) {
  // Initialize from the live input value (so presets/reset stay in sync on
  // remount), falling back to the file's declared initial value.
  const [bool, setBool] = useState(() => {
    const live = resolve();
    return typeof live?.value === "boolean"
      ? live.value
      : Boolean(input.initialValue);
  });
  const [num, setNum] = useState(() => {
    const live = resolve();
    return typeof live?.value === "number"
      ? live.value
      : Number(input.initialValue ?? 0);
  });

  if (input.type === StateMachineInputType.Trigger) {
    return (
      <Button size="sm" variant="secondary" onPress={() => resolve()?.fire()}>
        ⚡ {input.name}
      </Button>
    );
  }

  if (input.type === StateMachineInputType.Boolean) {
    return (
      <button
        type="button"
        onClick={() => {
          const i = resolve();
          if (!i) return;
          const next = !bool;
          i.value = next;
          setBool(next);
        }}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          bool
            ? "border-success/40 bg-success-soft text-success-soft-foreground"
            : "border-border bg-surface text-muted hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "inline-block size-2 rounded-full",
            bool ? "bg-success" : "bg-muted",
          )}
        />
        {input.name}
      </button>
    );
  }

  return (
    <label className="flex min-w-[180px] flex-col gap-1">
      <span className="flex items-center justify-between text-xs font-medium text-muted">
        <span>{input.name}</span>
        <span className="tabular-nums text-foreground">{num.toFixed(0)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={num}
        onChange={(e) => {
          const next = Number(e.target.value);
          const i = resolve();
          if (i) i.value = next;
          setNum(next);
        }}
        className="accent-[var(--accent)]"
      />
    </label>
  );
}

function RiveShowcaseCard({ asset, bg }: { asset: RiveAsset; bg: StageBg }) {
  // The live Rive instance lives ONLY in a ref, never in diffed state/props.
  const riveRef = useRef<Rive | null>(null);
  const [contents, setContents] = useState<RiveContents | null>(null);
  const [artboardName, setArtboardName] = useState<string | null>(null);
  const [play, setPlay] = useState<PlayTarget | null>(null);
  const [fit, setFit] = useState<Fit>(asset.tall ? Fit.Cover : Fit.Contain);
  // Bumped after preset/reset so input controls remount and re-read live values.
  const [syncTick, setSyncTick] = useState(0);

  const handleRive = useCallback(
    (instance: Rive) => {
      riveRef.current = instance;
      setContents(instance.contents);
      const init = asset.initialInputs;
      if (!init?.length) return;
      const machine = instance.playingStateMachineNames?.[0];
      if (!machine) return;
      try {
        const inputs = instance.stateMachineInputs(machine);
        for (const action of init) {
          const inp = inputs.find((i) => i.name === action.name);
          if (!inp) continue;
          if (action.fire) inp.fire();
          else if (action.value !== undefined) inp.value = action.value;
        }
      } catch {
        /* state machine not ready */
      }
    },
    [asset.initialInputs],
  );

  const getInput = useCallback(
    (machine: string, name: string): StateMachineInput | null => {
      try {
        return (
          riveRef.current
            ?.stateMachineInputs(machine)
            ?.find((i) => i.name === name) ?? null
        );
      } catch {
        return null;
      }
    },
    [],
  );

  const applyPreset = useCallback((preset: RivePreset) => {
    const rive = riveRef.current;
    if (!rive) return;
    const machine = preset.machine ?? rive.playingStateMachineNames?.[0];
    if (!machine) return;
    let inputs: StateMachineInput[] | undefined;
    try {
      inputs = rive.stateMachineInputs(machine);
    } catch {
      return;
    }
    if (!inputs) return;
    for (const action of preset.actions) {
      const input = inputs.find((i) => i.name === action.name);
      if (!input) continue;
      if (action.fire) input.fire();
      else if (action.value !== undefined) input.value = action.value;
    }
    setSyncTick((t) => t + 1);
  }, []);

  const artboards = contents?.artboards ?? [];
  const activeArtboard =
    artboards.find((a) => a.name === artboardName) ?? artboards[0];

  // Effective selection for the UI (the player itself autoplays the default
  // until the user explicitly picks something, which avoids a remount on load).
  const effectivePlay: PlayTarget | null =
    play ??
    (activeArtboard?.stateMachines[0]
      ? { kind: "sm", name: activeArtboard.stateMachines[0].name }
      : activeArtboard?.animations[0]
        ? { kind: "anim", name: activeArtboard.animations[0] }
        : null);

  const activeMachine =
    effectivePlay?.kind === "sm"
      ? activeArtboard?.stateMachines.find((m) => m.name === effectivePlay.name)
      : undefined;

  const presetList = (asset.presets ?? []).filter(
    (p) => !p.machine || p.machine === activeMachine?.name,
  );

  const playOptionCount =
    (activeArtboard?.stateMachines.length ?? 0) +
    (activeArtboard?.animations.length ?? 0);
  const playValue = effectivePlay
    ? `${effectivePlay.kind}:${effectivePlay.name}`
    : "";
  // Key (and thus remounts) depend only on explicit user selections.
  const remountKey = `${asset.id}::${artboardName ?? "d"}::${
    play ? `${play.kind}:${play.name}` : "default"
  }`;
  const loaded = Boolean(contents);

  return (
    <div className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{asset.title}</h3>
          <p className="max-w-2xl text-sm text-muted">{asset.description}</p>
        </div>
        <code className="shrink-0 text-[11px] text-muted">{asset.src}</code>
      </div>

      <Stage
        bg={bg}
        loaded={loaded}
        className={asset.tall ? "h-[520px]" : "h-[340px]"}
      >
        <RivePlayer
          key={remountKey}
          src={asset.src}
          artboard={artboardName ?? undefined}
          stateMachines={play?.kind === "sm" ? play.name : undefined}
          animations={play?.kind === "anim" ? play.name : undefined}
          fit={fit}
          viewModelBooleans={asset.viewModelBooleans}
          onRive={handleRive}
          className="size-full"
        />
      </Stage>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {artboards.length > 1 ? (
          <Select
            label="Artboard"
            value={activeArtboard?.name ?? ""}
            onChange={(v) => {
              setArtboardName(v);
              setPlay(null);
            }}
          >
            {artboards.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name}
              </option>
            ))}
          </Select>
        ) : null}

        {playOptionCount > 1 && activeArtboard ? (
          <Select
            label="Playing"
            value={playValue}
            onChange={(v) => {
              const idx = v.indexOf(":");
              setPlay({
                kind: v.slice(0, idx) as "sm" | "anim",
                name: v.slice(idx + 1),
              });
            }}
          >
            {activeArtboard.stateMachines.length ? (
              <optgroup label="State machines">
                {activeArtboard.stateMachines.map((m) => (
                  <option key={`sm:${m.name}`} value={`sm:${m.name}`}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {activeArtboard.animations.length ? (
              <optgroup label="Timelines">
                {activeArtboard.animations.map((n) => (
                  <option key={`anim:${n}`} value={`anim:${n}`}>
                    {n}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Select>
        ) : null}

        <SegToggle value={fit} options={FIT_OPTIONS} onChange={setFit} />

        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            riveRef.current?.reset({
              artboard: artboardName ?? undefined,
              stateMachines: play?.kind === "sm" ? play.name : undefined,
              animations: play?.kind === "anim" ? play.name : undefined,
              autoplay: true,
            });
            setSyncTick((t) => t + 1);
          }}
        >
          Replay
        </Button>
      </div>

      {presetList.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Presets
          </p>
          <div className="flex flex-wrap gap-2">
            {presetList.map((preset) => (
              <Button
                key={preset.label}
                size="sm"
                variant="accent"
                onPress={() => applyPreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {activeMachine && activeMachine.inputs.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Drive “{activeMachine.name}”
          </p>
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-background/40 p-3">
            {activeMachine.inputs.map((input) => (
              <InputControl
                key={`${input.name}:${syncTick}`}
                input={input}
                resolve={() => getInput(activeMachine.name, input.name)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {loaded && artboards.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:text-foreground">
            Inside the file ({artboards.length} artboard
            {artboards.length === 1 ? "" : "s"}) ▾
          </summary>
          <div className="mt-2 space-y-2">
            {artboards.map((ab) => (
              <div
                key={ab.name}
                className="rounded-xl border border-border bg-background/40 p-3 text-xs"
              >
                <span className="font-semibold text-foreground">{ab.name}</span>
                {ab.stateMachines.map((m) => (
                  <div key={m.name} className="mt-1.5 text-muted">
                    <span className="text-foreground">SM:</span> {m.name}
                    {m.inputs.length ? (
                      <span className="ml-1">
                        (
                        {m.inputs
                          .map((i) => `${i.name}:${inputTypeLabel(i.type)}`)
                          .join(", ")}
                        )
                      </span>
                    ) : null}
                  </div>
                ))}
                {ab.animations.length ? (
                  <div className="mt-1.5 text-muted">
                    <span className="text-foreground">Timelines:</span>{" "}
                    {ab.animations.join(", ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export function Animations() {
  const [bg, setBg] = useState<StageBg>("charcoal");

  return (
    <div className="min-h-svh bg-background text-foreground">
      <DevTopNav active="animations" />

      <main className="mx-auto max-w-5xl space-y-12 px-5 py-12">
        <header className="space-y-3">
          <Chip intent="accent" size="sm">
            Rive · WebGL2 · v{RIVE_RUNTIME_VERSION}
          </Chip>
          <h1 className="text-3xl font-bold tracking-tight">Animations</h1>
          <p className="max-w-2xl text-muted">
            The Rive vector animations cloned from Brilliant, self-hosted from{" "}
            <code className="text-foreground">/public/rive</code>. Each card
            below lets you switch artboard, state machine, and timeline, and
            drive any inputs, so you can see exactly what every file does.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Background
            </span>
            <SegToggle value={bg} options={BG_OPTIONS} onChange={setBg} />
          </div>
        </header>

        <Section
          id="source"
          title="Assets"
          description="Self-hosted instead of fetched from a CDN at runtime: the same files Brilliant ships."
        >
          <div className="space-y-1.5 rounded-2xl border border-border bg-surface p-5">
            {RIVE_ASSETS.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-0.5 border-t border-separator py-2 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex items-center gap-2">
                  <Chip size="sm" intent="accent">
                    .riv
                  </Chip>
                  <code className="text-xs text-foreground">{a.src}</code>
                </div>
                <code className="truncate text-xs text-muted" title={a.source}>
                  ← {a.source}
                </code>
              </div>
            ))}
            <div className="flex flex-col gap-0.5 border-t border-separator py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex items-center gap-2">
                <Chip size="sm">wasm</Chip>
                <code className="text-xs text-foreground">{RIVE_WASM_URL}</code>
              </div>
              <code
                className="truncate text-xs text-muted"
                title={RIVE_WASM_SOURCE}
              >
                ← {RIVE_WASM_SOURCE}
              </code>
            </div>
          </div>
          <Callout intent="info" title="Tip" className="mt-4">
            If a card looks empty, the animation may start hidden or need an
            input. Use <strong>Playing</strong> to pick a state machine or
            timeline, fire the <strong>Drive</strong> controls (e.g. Lightning’s
            bolt is hidden until toggled), or switch the{" "}
            <strong>Background</strong>. Light-colored art is invisible on dark.
          </Callout>
        </Section>

        <div className="space-y-8">
          {RIVE_ASSETS.map((asset) => (
            <RiveShowcaseCard key={asset.id} asset={asset} bg={bg} />
          ))}
        </div>
      </main>
    </div>
  );
}
