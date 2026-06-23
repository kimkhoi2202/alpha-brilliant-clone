import { TopNav } from "../components/chrome";
import { Button, Counter } from "../components/ui";
import { Auth } from "./sections/Auth";
import { Buttons } from "./sections/Buttons";
import { Cards } from "./sections/Cards";
import { Celebration } from "./sections/Celebration";
import { Chrome } from "./sections/Chrome";
import { CourseMapSection } from "./sections/CourseMapSection";
import { Feedback } from "./sections/Feedback";
import { Forms } from "./sections/Forms";
import { Gamification } from "./sections/Gamification";
import { HomeCatalog } from "./sections/HomeCatalog";
import { Lesson } from "./sections/Lesson";
import { MarketingPremium } from "./sections/MarketingPremium";
import { Onboarding } from "./sections/Onboarding";
import { Palette } from "./sections/Palette";
import { Primitives } from "./sections/Primitives";
import { Settings } from "./sections/Settings";
import { Surfaces } from "./sections/Surfaces";
import { Typography } from "./sections/Typography";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <path d="M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2z" />
      <path d="M18 3v16" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-5" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/** Gradient-border "Premium" pill — Brilliant's nav upsell treatment. */
function PremiumPill() {
  return (
    <span
      className="inline-block rounded-full p-px"
      style={{ backgroundImage: "var(--bp-gradient-iridescent)" }}
    >
      <span className="block rounded-full bg-background px-4 py-1.5 text-xs font-semibold text-foreground">
        Premium
      </span>
    </span>
  );
}

export function DesignSystem() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopNav
        tabs={[
          { id: "home", label: "Home", icon: <HomeIcon /> },
          {
            id: "components",
            label: "Components",
            icon: <BookIcon />,
            active: true,
          },
        ]}
        endContent={
          <>
            <PremiumPill />
            <Counter
              value={1}
              icon={<span aria-hidden>⚡</span>}
              aria-label="1 energy"
            />
            <Button variant="secondary" isIconOnly pill={false} aria-label="Menu">
              <MenuIcon />
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl space-y-16 px-5 py-12">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Component Library
          </h1>
          <p className="text-muted">
            A Brilliant-cloned design system · HeroUI v3 · Tailwind v4 · dark
          </p>
        </header>

        <Palette />
        <Typography />
        <Buttons />
        <Primitives />
        <Chrome />
        <Surfaces />
        <Cards />
        <CourseMapSection />
        <Lesson />
        <Forms />
        <Settings />
        <Auth />
        <Onboarding />
        <Gamification />
        <HomeCatalog />
        <MarketingPremium />
        <Celebration />
        <Feedback />
      </main>
    </div>
  );
}
