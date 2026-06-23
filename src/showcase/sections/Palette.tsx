import { cn } from "../../lib/cn";
import { Section, Subhead } from "../Section";

type Token = { name: string; token: string; className: string };

const CANVAS: Token[] = [
  { name: "Background", token: "--background", className: "bg-background" },
  { name: "Background 2", token: "--background-secondary", className: "bg-background-secondary" },
  { name: "Background 3", token: "--background-tertiary", className: "bg-background-tertiary" },
  { name: "Surface", token: "--surface", className: "bg-surface" },
  { name: "Overlay", token: "--overlay", className: "bg-overlay" },
  { name: "Default", token: "--default", className: "bg-default" },
  { name: "Segment", token: "--segment", className: "bg-segment" },
];

const BRAND: Token[] = [
  { name: "Accent", token: "--accent", className: "bg-accent" },
  { name: "Success", token: "--success", className: "bg-success" },
  { name: "Warning", token: "--warning", className: "bg-warning" },
  { name: "Danger", token: "--danger", className: "bg-danger" },
];

const LINES: Token[] = [
  { name: "Foreground", token: "--foreground", className: "bg-foreground" },
  { name: "Muted", token: "--muted", className: "bg-muted" },
  { name: "Border", token: "--border", className: "bg-border" },
  { name: "Separator", token: "--separator", className: "bg-separator" },
  { name: "Link", token: "--link", className: "bg-link" },
];

const RAMPS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
] as const;

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function Swatch({ name, token, className }: Token) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className={cn("h-16 w-full", className)} />
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="font-mono text-[11px] text-muted">{token}</p>
      </div>
    </div>
  );
}

function Grid({ tokens }: { tokens: Token[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tokens.map((t) => (
        <Swatch key={t.token} {...t} />
      ))}
    </div>
  );
}

function Ramps() {
  return (
    <div className="space-y-2">
      {RAMPS.map((ramp) => (
        <div key={ramp} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs font-medium capitalize text-muted">
            {ramp}
          </span>
          <div className="flex flex-1 gap-1">
            {SHADES.map((shade) => (
              <div
                key={shade}
                className="h-8 flex-1 rounded-md ring-1 ring-inset ring-white/5"
                style={{ backgroundColor: `var(--bp-${ramp}-${shade})` }}
                title={`${ramp}-${shade}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Palette() {
  return (
    <Section
      id="palette"
      title="Color tokens"
      description="Brilliant's exact palette. Semantic tokens map onto raw ramps; hover/soft/secondary shades are derived via color-mix, so changing one base token cascades everywhere."
    >
      <Subhead>Canvas &amp; surfaces</Subhead>
      <Grid tokens={CANVAS} />
      <Subhead className="mt-6">Brand &amp; status</Subhead>
      <Grid tokens={BRAND} />
      <Subhead className="mt-6">Text &amp; lines</Subhead>
      <Grid tokens={LINES} />
      <Subhead className="mt-8">Brilliant raw ramps (50 → 950)</Subhead>
      <Ramps />
    </Section>
  );
}
