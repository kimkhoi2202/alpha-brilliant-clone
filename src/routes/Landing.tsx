import { useNavigate } from "@tanstack/react-router";

import { Brand } from "../components/chrome/brand";
import { TopNav } from "../components/chrome/top-nav";
import { Button } from "../components/ui";
import { Hero } from "../landing/sections/hero";
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
 * the app's real components (TopNav, Brand, Button, the lesson visuals) so it
 * reads as the actual product, not a separate marketing site.
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
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
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
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-muted sm:px-6">
          &copy; {new Date().getFullYear()} AlphaBrilliant &middot; Learn the Pythagorean theorem by doing.
        </div>
      </footer>
    </div>
  );
}
