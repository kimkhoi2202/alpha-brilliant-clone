import type { MouseEvent } from "react";

import { Brand } from "../../components/chrome/brand";
import { scrollToId } from "../ui/section";

interface FooterLink {
  label: string;
  /**
   * Target section id. Links whose section already exists on the page
   * smooth-scroll to it (reusing the app's `scrollToId`); the rest are honest
   * placeholders that hold their place until those destinations ship.
   */
  id: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/** Footer link groups, taken from the landing copy deck (section 12). */
const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Learn",
    links: [
      { label: "How it works", id: "how-it-works" },
      { label: "The course", id: "course" },
      { label: "Koji", id: "koji" },
      { label: "Pricing", id: "pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", id: "about" },
      { label: "Careers", id: "careers" },
      { label: "Educators", id: "educators" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help", id: "help" },
      { label: "FAQ", id: "faq" },
      { label: "Contact", id: "contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", id: "privacy" },
      { label: "Terms", id: "terms" },
      { label: "Cookie settings", id: "cookies" },
    ],
  },
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** The brand mark is the footer's "home" affordance: return to the top. */
function scrollToTop(): void {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

function handleInPageNav(event: MouseEvent<HTMLAnchorElement>, id: string): void {
  // Footer links never jump the page to the top: real sections scroll smoothly
  // (instantly under reduced motion), placeholders simply stay put for now.
  event.preventDefault();
  const target = document.getElementById(id);
  if (!target) return;
  if (prefersReducedMotion()) {
    target.scrollIntoView({ block: "start" });
  } else {
    scrollToId(id);
  }
}

/**
 * Landing footer, in the app's real dark skin. Composed from real parts: the
 * `Brand` mark, the shared `scrollToId` navigation helper, and the page's
 * `max-w-6xl` container, so it lines up with everything above it. Useful and
 * human, not a link dump.
 */
export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
          <div className="flex max-w-sm flex-col items-start gap-4">
            <Brand onPress={scrollToTop} />
            <p className="text-pretty text-sm leading-relaxed text-muted">
              Learn the Pythagorean theorem by doing it.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:gap-x-12 md:grid-cols-4"
          >
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
                <ul className="mt-2 flex flex-col">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={`#${link.id}`}
                        onClick={(event) => handleInPageNav(event, link.id)}
                        className="-mx-1 inline-flex rounded-md px-1 py-1.5 text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-8 sm:mt-16 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} AlphaBrilliant.
          </p>
          <p className="text-pretty text-sm text-muted">
            Built for learners. Works with the AI tutor on or off.
          </p>
        </div>
      </div>
    </footer>
  );
}
