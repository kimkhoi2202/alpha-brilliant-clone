import { Section, Subhead, Row } from "../Section";

const SCALE = [
  { label: "Display", className: "text-5xl font-bold tracking-tight" },
  { label: "Heading 1", className: "text-3xl font-semibold tracking-tight" },
  { label: "Heading 2", className: "text-2xl font-semibold" },
  { label: "Title", className: "text-lg font-semibold" },
  { label: "Body", className: "text-base font-normal" },
  { label: "Small", className: "text-sm text-muted" },
];

const WEIGHTS = [
  { label: "Regular", className: "font-normal" },
  { label: "Medium", className: "font-medium" },
  { label: "Semibold", className: "font-semibold" },
  { label: "Bold", className: "font-bold" },
];

export function Typography() {
  return (
    <Section
      id="typography"
      title="Typography"
      description="Outfit (variable) is the single typeface across the app — a clean geometric sans in the spirit of Brilliant."
    >
      <Subhead>Type scale</Subhead>
      <div className="space-y-2">
        {SCALE.map((s) => (
          <div key={s.label} className="flex items-baseline gap-4">
            <span className="w-24 shrink-0 font-mono text-[11px] text-muted">
              {s.label}
            </span>
            <span className={s.className}>
              The hypotenuse squared
            </span>
          </div>
        ))}
      </div>

      <Subhead className="mt-8">Weights</Subhead>
      <Row className="gap-6">
        {WEIGHTS.map((w) => (
          <span key={w.label} className={`text-2xl ${w.className}`}>
            {w.label}
          </span>
        ))}
      </Row>

      <Subhead className="mt-8">Numerals</Subhead>
      <p className="text-3xl font-semibold tabular-nums tracking-tight">
        a² + b² = c² &nbsp;·&nbsp; 3² + 4² = 5²
      </p>
    </Section>
  );
}
