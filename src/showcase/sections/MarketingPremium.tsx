import { CategoryStrip, Hero } from "../../components/marketing";
import { PaywallComparison, TrialTimeline } from "../../components/premium";
import { Button, GradientButton } from "../../components/ui";
import { Section, Subhead } from "../Section";

const categories = [
  { id: "math", label: "Math", icon: "📐" },
  { id: "cs", label: "Computer Science", icon: "💻" },
  { id: "ai", label: "Coding & AI", icon: "🤖" },
  { id: "data", label: "Data Analysis", icon: "📊" },
  { id: "sci", label: "Science & Engineering", icon: "🔬" },
];

const rows = [
  { label: "Daily lessons", free: true, premium: true },
  { label: "Unlimited learning", free: false, premium: true },
  { label: "No ads", free: false, premium: true },
  { label: "Personalized practice", free: false, premium: true },
  { label: "Jump ahead in courses", free: false, premium: true },
];

const trial = [
  { icon: "🔓", title: "Today", description: "Unlock everything" },
  { icon: "🔔", title: "In 5 days", description: "Trial reminder" },
  { icon: "⭐", title: "In 7 days", description: "Trial ends" },
];

export function MarketingPremium() {
  return (
    <Section
      id="marketing-premium"
      title="Marketing & premium"
      description="Landing hero + subject strip, and the premium paywall comparison + trial timeline."
    >
      <Subhead>Hero</Subhead>
      <div className="rounded-2xl border border-border bg-background">
        <Hero
          title="Learn by doing"
          subtitle="Interactive problem solving that's effective and fun."
          actions={
            <>
              <Button pill variant="success" size="lg">
                I&apos;m a learner
              </Button>
              <Button pill variant="outline" size="lg">
                I&apos;m a parent or teacher
              </Button>
            </>
          }
        />
        <CategoryStrip items={categories} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <Subhead>Paywall comparison</Subhead>
          <PaywallComparison rows={rows} />
          <GradientButton fullWidth pill className="mt-4">
            Start my free week
          </GradientButton>
        </div>
        <div>
          <Subhead>Trial timeline</Subhead>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <TrialTimeline nodes={trial} />
          </div>
        </div>
      </div>
    </Section>
  );
}
