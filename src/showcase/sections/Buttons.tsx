import { Button, type ButtonVariant } from "../../components/ui";
import { Row, Section, Subhead } from "../Section";

const VARIANTS: ButtonVariant[] = [
  "primary",
  "accent",
  "secondary",
  "tertiary",
  "outline",
  "ghost",
  "danger",
  "success",
  "warning",
];

const label = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function Buttons() {
  return (
    <Section
      id="buttons"
      title="Buttons"
      description="One accessible Button (HeroUI under the hood). Pill-shaped like Brilliant, with filled CTAs using the 3D press-down lip and secondary controls staying flatter. `primary` is the high-contrast white CTA (Check / Continue / Sign in), `accent` is the blue ‘Start’, plus success / warning / danger."
    >
      <Subhead>Variants</Subhead>
      <Row>
        {VARIANTS.map((v) => (
          <Button key={v} variant={v}>
            {label(v)}
          </Button>
        ))}
      </Row>

      <Subhead className="mt-6">Modes: clicky (3D) vs flat</Subhead>
      <div className="space-y-3">
        <Row>
          {(["primary", "accent", "success", "warning"] as const).map((v) => (
            <Button key={v} variant={v}>
              {label(v)}
            </Button>
          ))}
          <span className="text-xs font-medium text-muted">← clicky</span>
        </Row>
        <Row>
          {(["primary", "accent", "success", "warning"] as const).map((v) => (
            <Button key={v} variant={v} clicky={false}>
              {label(v)}
            </Button>
          ))}
          <span className="text-xs font-medium text-muted">← flat</span>
        </Row>
      </div>

      <Subhead className="mt-6">Shape</Subhead>
      <Row>
        <Button>Pill (default)</Button>
        <Button pill={false}>Rounded</Button>
        <Button variant="accent">Start</Button>
      </Row>

      <Subhead className="mt-6">Sizes</Subhead>
      <Row>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </Row>

      <Subhead className="mt-6">States (press them to feel the lip)</Subhead>
      <Row>
        <Button>Default</Button>
        <Button isDisabled>Disabled</Button>
        <Button isPending>Checking…</Button>
        <Button isIconOnly aria-label="Confirm answer">
          <CheckIcon />
        </Button>
      </Row>

      <Subhead className="mt-6">Full width (lesson CTA)</Subhead>
      <div className="max-w-sm space-y-3">
        <Button fullWidth size="lg">
          Check
        </Button>
        <Button fullWidth size="lg" variant="success">
          Continue
        </Button>
      </div>
    </Section>
  );
}
