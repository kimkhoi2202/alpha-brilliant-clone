import { Card } from "@heroui/react";

import { Button } from "../../components/ui";
import { Section, Subhead } from "../Section";

const VARIANTS = ["default", "secondary", "tertiary", "transparent"] as const;

export function Surfaces() {
  return (
    <Section
      id="surfaces"
      title="Surfaces"
      description="Cards group related content. Variants describe prominence (which surface token they sit on), not bespoke colors."
    >
      <Subhead>Card variants</Subhead>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {VARIANTS.map((variant) => (
          <Card key={variant} variant={variant}>
            <Card.Header>
              <Card.Title>Pythagoras&rsquo; Theorem</Card.Title>
              <Card.Description>variant=&ldquo;{variant}&rdquo;</Card.Description>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-muted">
                In a right triangle, the square of the hypotenuse equals the sum
                of the squares of the legs.
              </p>
            </Card.Content>
            <Card.Footer>
              <Button size="sm">Start</Button>
            </Card.Footer>
          </Card>
        ))}
      </div>
    </Section>
  );
}
