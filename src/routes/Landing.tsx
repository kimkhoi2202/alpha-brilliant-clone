import { useNavigate } from "@tanstack/react-router";

import { Brand } from "../components/chrome/brand";
import { TopNav } from "../components/chrome/top-nav";
import { Button } from "../components/ui";
import { CoursePath } from "../landing/sections/course-path";
import { FAQ } from "../landing/sections/faq";
import { Features } from "../landing/sections/features";
import { FinalCTA } from "../landing/sections/final-cta";
import { Footer } from "../landing/sections/footer";
import { Hero } from "../landing/sections/hero";
import { HowItWorks } from "../landing/sections/how-it-works";
import { InteractiveProof } from "../landing/sections/interactive-proof";
import { KojiTutor } from "../landing/sections/koji";
import { Pricing } from "../landing/sections/pricing";
import { SocialProof } from "../landing/sections/social-proof";
import { scrollToId } from "../landing/ui/section";

const NAV = [
  { id: "how-it-works", label: "How it works" },
  { id: "proof", label: "Proof" },
  { id: "features", label: "Features" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

/**
 * Public marketing landing, in the app's real dark skin. Composed entirely from
 * the app's real components (TopNav, Brand, Button, the lesson visuals, the
 * premium/gamification/course surfaces) so it reads as the actual product, not a
 * separate marketing site.
 */
export function Landing() {
  const navigate = useNavigate();
  const goAuth = () => void navigate({ to: "/auth" });

  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopNav
        brand={<Brand onPress={() => window.scrollTo({ top: 0, behavior: "smooth" })} />}
        tabs={NAV.map((item) => ({
          id: item.id,
          label: item.label,
          onPress: () => scrollToId(item.id),
        }))}
        endContent={
          <>
            <button
              type="button"
              onClick={goAuth}
              className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              Log in
            </button>
            <Button variant="accent" size="sm" onPress={goAuth}>
              Start free
            </Button>
          </>
        }
      />

      <main>
        <Hero />
        <HowItWorks />
        <InteractiveProof />
        <Features />
        <KojiTutor />
        <CoursePath />
        <SocialProof />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
