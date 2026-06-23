import { Button, type ButtonVariant } from "../../components/ui";
import { Section, Subhead, Row } from "../Section";

const VARIANTS: ButtonVariant[] = [
  "primary",
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
      description="One accessible Button (HeroUI under the hood), pill-shaped by default, extended with success/warning to match Brilliant's full set of CTA colors."
    >
      <Subhead>Variants</Subhead>
      <Row>
        {VARIANTS.map((v) => (
          <Button key={v} variant={v}>
            {label(v)}
          </Button>
        ))}
      </Row>

      <Subhead className="mt-6">Sizes</Subhead>
      <Row>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </Row>

      <Subhead className="mt-6">States</Subhead>
      <Row>
        <Button>Default</Button>
        <Button isDisabled>Disabled</Button>
        <Button isPending>Checking…</Button>
        <Button isIconOnly aria-label="Confirm answer">
          <CheckIcon />
        </Button>
      </Row>

      <Subhead className="mt-6">Full width (lesson CTA)</Subhead>
      <div className="max-w-sm">
        <Button fullWidth variant="success" size="lg">
          Continue
        </Button>
      </div>
    </Section>
  );
}
