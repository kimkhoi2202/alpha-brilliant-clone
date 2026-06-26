import type { CSSProperties } from "react";
import { Tabs } from "@heroui/react";

import { Avatar } from "../../components/ui";
import { cn } from "../../lib/cn";
import { LandingSection, SectionHeading } from "../ui/section";

/**
 * Social proof — credibility staged for the student and the people who buy for
 * them, in the app's real dark skin. Audience-segmented quotes ride on the real
 * HeroUI `Tabs` (segmented control), each quote uses the app's real `Avatar`
 * (initials) + `Chip` (@handle), and the section anchors on large, plain
 * outcome stat typography.
 *
 * Honesty: every quote and number here is an explicit, illustrative PLACEHOLDER.
 * Attributions are role labels with `@placeholder` handles (no fabricated people,
 * photos, press logos, or measured stats). Replace before launch.
 */

interface Quote {
  /** The testimonial body. Placeholder copy, grounded in real product moments. */
  body: string;
  /** Role label (doubles as the Avatar initial + deterministic color). */
  name: string;
  /** Illustrative descriptor, e.g. a grade level. */
  detail: string;
  /** The lead quote for an audience gets the larger, featured treatment. */
  featured?: boolean;
}

interface Audience {
  id: string;
  label: string;
  quotes: readonly Quote[];
}

const AUDIENCES: readonly Audience[] = [
  {
    id: "students",
    label: "Students",
    quotes: [
      {
        body: "I dragged the triangle around for a minute and the squares just made sense.",
        name: "Student",
        detail: "9th grade",
        featured: true,
      },
      {
        body: "The hint showed me I added the legs instead of squaring them, so I fixed it on the next try.",
        name: "Learner",
        detail: "Test prep",
      },
      {
        body: "I kept a streak going just to finish the last lesson.",
        name: "Beginner",
        detail: "Just started",
      },
    ],
  },
  {
    id: "teachers",
    label: "Teachers",
    quotes: [
      {
        body: "It builds the intuition my lectures can't, one triangle at a time.",
        name: "Teacher",
        detail: "Geometry",
        featured: true,
      },
      {
        body: "Students arrive already understanding why the squares add up.",
        name: "Educator",
        detail: "High school",
      },
      {
        body: "Instant feedback saves me from re-teaching the same slip every week.",
        name: "Mentor",
        detail: "After school",
      },
    ],
  },
  {
    id: "parents",
    label: "Parents",
    quotes: [
      {
        body: "She actually wants to do her geometry now. The streak is doing something right.",
        name: "Parent",
        detail: "9th grader",
        featured: true,
      },
      {
        body: "No videos to sit through, so the homework actually gets done.",
        name: "Family",
        detail: "10th grader",
      },
      {
        body: "I can see which lessons are solid and which need another pass.",
        name: "Guardian",
        detail: "First year",
      },
    ],
  },
];

/** Entrance for the active panel's cards: a gentle, staggered rise that
 *  collapses to nothing under reduced motion (and is never scroll-gated). */
const RISE = "animate-in fade-in-0 slide-in-from-bottom-3 duration-500 ease-out motion-reduce:animate-none";

function QuoteCard({
  quote,
  className,
  style,
}: {
  quote: Quote;
  className?: string;
  style?: CSSProperties;
}) {
  const featured = quote.featured ?? false;

  return (
    <figure
      style={style}
      className={cn(
        "relative flex h-full flex-col gap-4 rounded-2xl border-2 border-border bg-[var(--surface)] p-6",
        "transition-colors duration-200 ease-out hover:border-[color:var(--border-hover)]",
        featured && "gap-5 p-7 sm:p-8",
        className,
      )}
    >
      <blockquote
        className={cn(
          "text-pretty text-foreground",
          featured
            ? "text-xl font-medium leading-relaxed sm:text-2xl"
            : "text-base leading-relaxed",
        )}
      >
        {`\u201C${quote.body}\u201D`}
      </blockquote>

      <figcaption className="mt-auto flex items-center gap-3">
        <Avatar name={quote.name} size={featured ? "md" : "sm"} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">{quote.name}</span>
          <span className="text-xs text-muted">{quote.detail}</span>
        </div>
      </figcaption>
    </figure>
  );
}

export function SocialProof() {
  return (
    <LandingSection id="reviews" width="wide">
      <SectionHeading
        eyebrow="What learners say"
        title={
          <>
            Built for students.{" "}
            <span className="text-[var(--accent)]">Trusted</span> by the people
            who care about them.
          </>
        }
        description="Illustrative placeholders for now. Every quote and number here is replaced with a real, verified one before launch."
      />

      <Tabs defaultSelectedKey="students" className="mt-10 sm:mt-12">
        <Tabs.ListContainer className="flex justify-center">
          <Tabs.List
            aria-label="Reviews by audience"
            className="w-fit border border-border"
          >
            {AUDIENCES.map((audience) => (
              <Tabs.Tab key={audience.id} id={audience.id}>
                {audience.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {AUDIENCES.map((audience) => {
          const featured = audience.quotes.find((quote) => quote.featured);
          const supporting = audience.quotes.filter((quote) => !quote.featured);

          return (
            <Tabs.Panel key={audience.id} id={audience.id} className="w-full p-0">
              <div className="mx-auto grid max-w-4xl gap-4 pt-4 sm:gap-5">
                {featured ? <QuoteCard quote={featured} className={RISE} /> : null}

                <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                  {supporting.map((quote, index) => (
                    <QuoteCard
                      key={quote.name}
                      quote={quote}
                      className={RISE}
                      style={{ animationDelay: `${(index + 1) * 90}ms` }}
                    />
                  ))}
                </div>
              </div>
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </LandingSection>
  );
}
