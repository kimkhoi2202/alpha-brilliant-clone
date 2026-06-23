import { Auth } from "./sections/Auth";
import { Buttons } from "./sections/Buttons";
import { Cards } from "./sections/Cards";
import { Chrome } from "./sections/Chrome";
import { CourseMapSection } from "./sections/CourseMapSection";
import { Feedback } from "./sections/Feedback";
import { Forms } from "./sections/Forms";
import { Lesson } from "./sections/Lesson";
import { Onboarding } from "./sections/Onboarding";
import { Palette } from "./sections/Palette";
import { Settings } from "./sections/Settings";
import { Primitives } from "./sections/Primitives";
import { Surfaces } from "./sections/Surfaces";
import { Typography } from "./sections/Typography";

export function DesignSystem() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-lg font-bold text-accent-foreground">
            △
          </span>
          <div>
            <h1 className="text-base font-semibold leading-tight">
              AlphaBrilliant — Design System
            </h1>
            <p className="text-xs text-muted">
              HeroUI v3 · Tailwind v4 · Outfit · modeled on Brilliant
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-5 py-12">
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
        <Feedback />
      </main>
    </div>
  );
}
