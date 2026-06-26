import { useNavigate } from "@tanstack/react-router";

import { Button, Disclosure } from "../../components/ui";
import { Eyebrow, LandingSection } from "../ui/section";

interface FaqItem {
  /** The visitor's question, in their own words. */
  question: string;
  /** A plain, honest answer. No hype, no em dashes. */
  answer: string;
  /** Open the most reassuring answer so the list never reads as a wall of closed rows. */
  defaultOpen?: boolean;
}

/**
 * FAQ copy, grounded in marketing-brief/LANDING-COPY.md: the FAQ deck (section
 * 10) plus the pricing (9) and course/mastery (7) sections for the price and
 * "mastered" answers the brief asks for. The anxious questions lead (no AI
 * needed, price, fit, mastery, phone); nothing invents a feature the product
 * does not have, and pricing stays an honest placeholder.
 */
const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "Do I need the AI to learn?",
    answer:
      "No. The entire course teaches without any AI. Switch Koji off and every lesson still works from start to finish, with hand-written hints and instant feedback. Koji is an upgrade, not the product.",
    defaultOpen: true,
  },
  {
    question: "How much does it cost?",
    answer:
      "The full course is free, forever: five lessons plus the Level Review, with instant feedback, daily streaks, and saved progress. Premium adds Koji, your AI tutor, and unlimited verified practice. Final premium pricing is still being set, so treat any figure you see as a placeholder for now.",
  },
  {
    question: "Who is this for?",
    answer:
      "High-school students meeting right triangles, whether you froze on it last week or you are cramming for a test. No teacher or textbook required.",
  },
  {
    question: "What does \u201Cmastered\u201D mean here?",
    answer:
      "It means you can do it, not that you watched it. Each lesson rolls up into a mastery signal that shows what is solid and what to revisit, and the chapter ends with a Level Review of ten mixed questions. Score eight of ten to pass.",
  },
  {
    question: "Does it work on my phone?",
    answer:
      "Yes. AlphaBrilliant is built mobile-first, with touch-friendly drag and tap and smooth figures.",
  },
  {
    question: "What will I actually learn?",
    answer:
      "One chapter, deeply: the Pythagorean theorem. By the end you can name the parts of a right triangle, find a missing side, tell whether a triangle is right, and measure straight-line distance.",
  },
  {
    question: "Is there any video?",
    answer:
      "No. There are no lecture videos and no walls of text. You learn by dragging, counting, plotting, and rearranging, with feedback on every step.",
  },
  {
    question: "Can Koji just give me the answer?",
    answer:
      "Not for free. Koji gives layered hints that stop short of the answer, and only reveals a worked solution after you have genuinely tried. Even then it walks you through your specific gap, and it never counts as a first-try win.",
  },
  {
    question: "How does Koji avoid making things up?",
    answer:
      "Every hint and solution is checked by our own math engine before you see it. Generated practice problems have their answers computed and verified by us first, so a problem is always solvable and graded correctly.",
  },
  {
    question: "Will my progress be saved?",
    answer:
      "Yes. Your progress, streak, and mastery are saved to your account, so you can leave mid-lesson and pick up on any device.",
  },
];

/**
 * Per-row chrome for the real `Disclosure`: a full hairline divider between
 * rows and a clear keyboard focus ring on the trigger button. The component
 * itself is untouched; we only pass `className` (an inset ring avoids any
 * layout shift, and the descendant selector targets its own button).
 */
const ROW_CLASS =
  "border-b border-border [&>button]:rounded-md [&>button]:focus-visible:outline-none [&>button]:focus-visible:ring-2 [&>button]:focus-visible:ring-inset [&>button]:focus-visible:ring-[var(--accent)]";

/**
 * FAQ: the anxiety-lowering close before the footer, in the app's real dark
 * skin. A calm heading rail (sticky on desktop) sits beside one divided column
 * of the app's actual `Disclosure` accordions, one per question. The measure is
 * held near 70ch, spacing is generous, and the most reassuring answer (you do
 * not need the AI) is open by default. Composed from real components; no
 * hand-rolled accordion.
 */
export function FAQ() {
  const navigate = useNavigate();

  return (
    <LandingSection id="faq">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-5 lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>Questions</Eyebrow>

          <h2
            id="faq-heading"
            className="text-balance text-[clamp(1.875rem,4vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.02em] text-foreground"
          >
            There are no silly questions.
          </h2>

          <p className="max-w-[36ch] text-pretty text-base leading-relaxed text-muted sm:text-lg">
            Honest answers to what students and parents ask most. The course is
            free to start, so if your question is not here, you can just try the
            first lesson and see.
          </p>

          <div className="mt-1 flex flex-col items-start gap-2">
            <Button variant="accent" size="lg" onPress={() => void navigate({ to: "/auth" })}>
              Start learning, free
            </Button>
            <span className="text-sm text-muted">Free to start. No card required.</span>
          </div>
        </div>

        <div className="border-t border-border">
          {FAQ_ITEMS.map((item) => (
            <Disclosure
              key={item.question}
              defaultOpen={item.defaultOpen}
              className={ROW_CLASS}
              title={
                <span className="block py-2 text-base font-semibold leading-snug text-foreground sm:text-[1.0625rem]">
                  {item.question}
                </span>
              }
            >
              <p className="max-w-[64ch] pb-5 pl-6 text-[0.9375rem] leading-relaxed text-pretty text-muted sm:text-base">
                {item.answer}
              </p>
            </Disclosure>
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
