import {
  Badge,
  Button,
  Chip,
  Counter,
  Divider,
  ProgressBar,
  Tooltip,
} from "../../components/ui";
import { Row, Section, Subhead } from "../Section";

export function Primitives() {
  return (
    <Section
      id="primitives"
      title="Primitives"
      description="Small building blocks the app chrome and lesson player compose from. Icons shown are placeholders."
    >
      <Subhead>Progress</Subhead>
      <div className="max-w-md space-y-3">
        <ProgressBar value={35} aria-label="Lesson progress" />
        <ProgressBar
          value={70}
          intent="accent"
          size="sm"
          aria-label="Course progress"
        />
      </div>

      <Subhead className="mt-6">Counters (nav stats)</Subhead>
      <Row>
        <Counter
          value={5}
          icon={<span aria-hidden>🔥</span>}
          aria-label="5 day streak"
        />
        <Counter
          value={12}
          icon={<span aria-hidden>⚡</span>}
          aria-label="12 energy"
        />
        <Counter
          value={240}
          icon={<span aria-hidden>💎</span>}
          aria-label="240 gems"
        />
      </Row>

      <Subhead className="mt-6">Badges</Subhead>
      <Row>
        <Badge intent="success">Verified</Badge>
        <Badge intent="accent">Primary</Badge>
        <Badge intent="warning">Unverified</Badge>
        <Badge intent="danger">Expired</Badge>
        <Badge>Neutral</Badge>
      </Row>

      <Subhead className="mt-6">Chips</Subhead>
      <Row>
        <Chip intent="accent">Level 1</Chip>
        <Chip intent="success" variant="solid">
          Completed
        </Chip>
        <Chip intent="warning">31%</Chip>
        <Chip size="sm">New</Chip>
      </Row>

      <Subhead className="mt-6">Divider</Subhead>
      <div className="max-w-md">
        <p className="text-sm text-muted">Above</p>
        <Divider className="my-3" />
        <p className="text-sm text-muted">Below</p>
      </div>

      <Subhead className="mt-6">Tooltip</Subhead>
      <Row>
        <Tooltip content="Brilliant-style hover hint">
          <Button variant="secondary">Hover me</Button>
        </Tooltip>
        <Tooltip content="Shows on focus too" placement="bottom">
          <Button variant="outline">Focus me</Button>
        </Tooltip>
      </Row>
    </Section>
  );
}
