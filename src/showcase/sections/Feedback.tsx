import { Alert, Chip, Spinner } from "@heroui/react";

import { cn } from "../../lib/cn";
import { Button } from "../../components/ui";
import { Section, Subhead, Row } from "../Section";

const ALERTS = [
  {
    status: "accent",
    title: "Heads up",
    description: "Drag the legs of the triangle to explore the relationship.",
  },
  {
    status: "success",
    title: "Correct!",
    description: "The square on the hypotenuse equals the other two combined.",
  },
  {
    status: "warning",
    title: "Not quite",
    description: "You added the sides — try squaring them first.",
  },
  {
    status: "danger",
    title: "Something went wrong",
    description: "We couldn't save your progress. Check your connection.",
  },
] as const;

function FeedbackCard({
  tone,
  title,
  body,
  cta,
}: {
  tone: "success" | "warning";
  title: string;
  body: string;
  cta: string;
}) {
  // Exact Brilliant lesson-feedback panel fills (#00370F / #403000).
  const panel =
    tone === "success"
      ? "border-success/30 bg-feedback-correct"
      : "border-warning/30 bg-feedback-retryable";
  const bodyText =
    tone === "success"
      ? "text-feedback-correct-foreground"
      : "text-feedback-retryable-foreground";
  const titleText = tone === "success" ? "text-success" : "text-warning";

  return (
    <div className={cn("rounded-2xl border p-5", panel)}>
      <p className={cn("font-semibold", titleText)}>{title}</p>
      <p className={cn("mt-1 text-sm", bodyText)}>{body}</p>
      <div className="mt-4">
        <Button variant={tone} size="sm">
          {cta}
        </Button>
      </div>
    </div>
  );
}

export function Feedback() {
  return (
    <Section
      id="feedback"
      title="Feedback"
      description="Instant, specific responses — the heart of the learn-by-doing loop."
    >
      <Subhead>Alerts</Subhead>
      <div className="space-y-3">
        {ALERTS.map((a) => (
          <Alert key={a.status} status={a.status}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{a.title}</Alert.Title>
              <Alert.Description>{a.description}</Alert.Description>
            </Alert.Content>
          </Alert>
        ))}
      </div>

      <Subhead className="mt-8">Status chips</Subhead>
      <Row>
        <Chip>Locked</Chip>
        <Chip className="bg-accent-soft text-accent-soft-foreground">
          In progress
        </Chip>
        <Chip className="bg-success-soft text-success-soft-foreground">
          Mastered
        </Chip>
        <Chip className="bg-warning-soft text-warning-soft-foreground">
          Needs review
        </Chip>
      </Row>

      <Subhead className="mt-8">
        Lesson feedback panels (Brilliant exact: #00370F / #403000)
      </Subhead>
      <div className="grid gap-4 sm:grid-cols-2">
        <FeedbackCard
          tone="success"
          title="Bingo."
          body="a² + b² = c² holds for every right triangle."
          cta="Continue"
        />
        <FeedbackCard
          tone="warning"
          title="That's not right. What could you change?"
          body="Compare the area of the big square to the two smaller ones."
          cta="Try again"
        />
      </div>

      <Subhead className="mt-8">Loading</Subhead>
      <Row>
        <Spinner />
        <span className="text-sm text-muted">Checking your answer…</span>
      </Row>
    </Section>
  );
}
