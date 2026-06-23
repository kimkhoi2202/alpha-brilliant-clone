import { DevTopNav } from "./DevTopNav";
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

export function DesignSystem() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <DevTopNav active="components" />

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
