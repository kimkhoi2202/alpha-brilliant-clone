import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { Switch } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";

import { PaywallComparison, TrialTimeline } from "../../components/premium";
import type { PaywallRow, TrialNode } from "../../components/premium";
import { Button, Chip } from "../../components/ui";
import {
  Reveal,
  duration,
  easing,
  staggerContainer,
  staggerItem,
  useMotionEnabled,
  viewportOnce,
} from "../motion";
import { LandingSection, SectionHeading } from "../ui/section";

const FREE_BENEFITS: string[] = [
  "The full Pythagorean chapter: five lessons plus Level Review",
  "Instant, specific feedback on every answer",
  "Daily streaks and saved progress across devices",
  "Works on your phone",
];

const PREMIUM_BENEFITS: string[] = [
  "Everything in Free",
  "Koji, your AI tutor: layered hints, \u201Cwhy was that wrong?\u201D explanations, and earned solution reveals",
  "Talk to Koji by voice, hands-free, with a live transcript",
  "Verified Infinite Practice: endless fresh problems at the right difficulty",
];

/** Real `PaywallComparison` rows: three shared truths, then what Premium adds. */
const COMPARE_ROWS: PaywallRow[] = [
  { label: "Full Pythagorean chapter", free: true, premium: true },
  { label: "Instant feedback on every answer", free: true, premium: true },
  { label: "Streaks and saved progress", free: true, premium: true },
  { label: "Koji\u2019s layered hints", free: false, premium: true },
  { label: "Why-was-that-wrong explanations", free: false, premium: true },
  { label: "Talk to Koji by voice", free: false, premium: true },
  { label: "Verified Infinite Practice", free: false, premium: true },
];

/** Real `TrialTimeline` nodes, grounded in the in-app trial (Day 1 / 5 / 7). */
const TRIAL_NODES: TrialNode[] = [
  { icon: <UnlockIcon />, title: "Day 1", description: "You\u2019re in" },
  { icon: <BellIcon />, title: "Day 5", description: "We remind you" },
  { icon: <FlagIcon />, title: "Day 7", description: "Trial ends" },
];

const TRUST: string[] = ["No credit card", "Cancel anytime", "Works with AI off"];

/** Real Premium pricing: $29.99/mo, or $19.99/mo when billed yearly (save 33%). */
const PREMIUM_PRICE = { monthly: "$29.99", yearly: "$19.99" } as const;

/**
 * One-time soft `--accent` bloom behind the Premium card. Blooms once with the
 * card reveal (driven by the grid's stagger container) so Premium reads as the
 * recommended plan without a heavy shadow. Reduced motion renders it at rest.
 */
const premiumGlow: Variants = {
  hidden: { opacity: 0, scale: 0.7 },
  shown: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.reveal, ease: easing.out, delay: 0.15 },
  },
};

/**
 * Pricing, in the app's real dark skin. Composes the product's actual premium
 * components verbatim (`PaywallComparison`, `TrialTimeline`) inside two
 * deliberately asymmetric plan cards: Free reads as a flat hairline surface,
 * Premium reuses the app's own emphasized accent-card idiom (the
 * `PracticePromoCard` lift) plus a single gold "Most popular" Chip. No purple
 * SaaS gradient: emphasis is brand blue with one gold steer. Nothing hand-rolled
 * that the app already ships.
 */
export function Pricing() {
  const navigate = useNavigate();
  const goAuth = () => void navigate({ to: "/auth" });

  const [yearly, setYearly] = useState(false);
  const premiumPrice = yearly ? PREMIUM_PRICE.yearly : PREMIUM_PRICE.monthly;
  const enabled = useMotionEnabled();

  return (
    <LandingSection id="pricing">
      <SectionHeading
        title="Start free. Add Koji when you want a tutor."
        description="The full course is free, forever. Premium adds your AI tutor and unlimited practice."
      />

      <BillingToggle yearly={yearly} onYearlyChange={setYearly} />

      {/* Plan cards rise/fade in as a small two-item stagger (Free, then
          Premium). Reduced motion renders them at rest, fully visible. */}
      <motion.div
        className="mt-10 grid items-stretch gap-6 md:grid-cols-2"
        initial={enabled ? "hidden" : false}
        whileInView={enabled ? "shown" : undefined}
        viewport={viewportOnce}
        variants={enabled ? staggerContainer : undefined}
      >
        {/* Free: flat hairline surface, secondary CTA. */}
        <motion.article
          aria-labelledby="plan-free"
          variants={enabled ? staggerItem : undefined}
          className="flex h-full flex-col rounded-2xl border border-border bg-[var(--surface)] p-6 sm:p-7"
        >
          <h3 id="plan-free" className="text-lg font-bold text-foreground">
            Free
          </h3>
          <p className="mt-1 text-sm text-muted">The whole course, free</p>

          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl">
              $0
            </span>
            <span className="text-sm font-medium text-muted">forever</span>
          </div>

          <ul className="mt-6 flex flex-col gap-3">
            {FREE_BENEFITS.map((benefit) => (
              <Benefit key={benefit}>{benefit}</Benefit>
            ))}
          </ul>

          <div className="mt-auto pt-7">
            <p className="mb-3 text-center text-xs text-muted">
              No card required. This is the complete learn-by-doing course.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onPress={goAuth}
            >
              Start learning, free
            </Button>
          </div>
        </motion.article>

        {/* Premium: the app's real emphasized accent card + one gold steer. */}
        <motion.article
          aria-labelledby="plan-premium"
          variants={enabled ? staggerItem : undefined}
          className="relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-6 sm:p-7"
        >
          {/* One-time accent bloom marking the recommended plan. Clipped by the
              card's overflow-hidden, so it stays a bounded glow (no heavy shadow). */}
          <motion.div
            aria-hidden
            variants={enabled ? premiumGlow : undefined}
            className="pointer-events-none absolute inset-x-0 top-0 mx-auto -mt-24 size-64 rounded-full bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] blur-3xl"
          />
          <div className="relative flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-3">
              <h3 id="plan-premium" className="text-lg font-bold text-foreground">
                Premium
              </h3>
              <Chip
                intent="warning"
                variant="solid"
                size="sm"
                className="uppercase tracking-wide"
              >
                Most popular
              </Chip>
            </div>
            <p className="mt-1 text-sm text-muted">
              Add Koji and unlimited practice
            </p>

            <div className="mt-5 flex items-baseline gap-1.5">
              {/* Signature: the price swaps with a small slide+fade when the
                  billing period flips. An invisible sizer holds the box width
                  (both prices are 6 tabular chars) so "/ month" never shifts
                  during mode="wait". The aria-label carries the spoken price. */}
              <span
                aria-label={`${premiumPrice} per month${yearly ? ", billed yearly" : ""}`}
                className="relative inline-block text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl"
              >
                <span aria-hidden className="invisible">
                  {premiumPrice}
                </span>
                {enabled ? (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={premiumPrice}
                      aria-hidden
                      className="absolute inset-0"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: duration.fast,
                          ease: easing.out,
                        },
                      }}
                      exit={{
                        opacity: 0,
                        y: -8,
                        transition: { duration: 0.14, ease: easing.out },
                      }}
                    >
                      {premiumPrice}
                    </motion.span>
                  </AnimatePresence>
                ) : (
                  <span aria-hidden className="absolute inset-0">
                    {premiumPrice}
                  </span>
                )}
              </span>
              <span className="text-sm font-medium text-muted">/ month</span>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {yearly
                ? "$239.88 billed yearly. After the 7-day trial."
                : "After the 7-day trial."}
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {PREMIUM_BENEFITS.map((benefit) => (
                <Benefit key={benefit}>{benefit}</Benefit>
              ))}
            </ul>

            <div className="mt-auto pt-7">
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onPress={goAuth}
              >
                Try Premium free for 7 days
              </Button>
            </div>
          </div>
        </motion.article>
      </motion.div>

      {/* Trust strip (mirrors the hero's accent-check pattern). */}
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
        {TRUST.map((item) => (
          <li key={item} className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="grid size-4 place-items-center rounded-full"
              style={{
                backgroundColor:
                  "color-mix(in oklab, var(--accent) 22%, transparent)",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4 10-10"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {item}
          </li>
        ))}
      </ul>

      {/* Compare what's included: the REAL PaywallComparison. Block-level
          reveal — the component owns no row-stagger API, so it reveals as a unit
          (and we never edit it). Reduced motion renders it instantly. */}
      <Reveal className="mx-auto mt-16 max-w-2xl">
        <h3 className="text-center text-xl font-bold tracking-tight text-foreground">
          Compare what&#39;s included
        </h3>
        <p className="mt-2 text-center text-sm text-muted">
          Free covers the whole course. Premium adds the tutor and unlimited
          practice.
        </p>
        <PaywallComparison rows={COMPARE_ROWS} className="mt-6" />
      </Reveal>

      {/* How the free trial works: the REAL TrialTimeline. Block-level reveal
          (the timeline owns no node-stagger API). */}
      <Reveal className="mx-auto mt-16 max-w-3xl">
        <h3 className="text-center text-xl font-bold tracking-tight text-foreground">
          How the free trial works
        </h3>
        <p className="mt-2 text-center text-sm text-muted">
          Seven days of Premium, free. Cancel anytime before it ends.
        </p>
        <div className="mt-6 rounded-2xl border border-border bg-[var(--surface)] p-6 sm:p-8">
          <TrialTimeline nodes={TRIAL_NODES} />
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          No charge until day 7. Cancel before then and you pay nothing.
        </p>
      </Reveal>

      {/* Honest "why premium" note: a human reason, not a sales line. */}
      <div className="mx-auto mt-16 max-w-2xl text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Why is the tutor paid?
        </h3>
        <p className="mt-3 text-pretty leading-relaxed text-muted">
          Koji&#39;s realtime voice runs on advanced AI that costs real money per
          minute. Keeping it on a paid tier is how we keep the whole course free
          for everyone.
        </p>
      </div>
    </LandingSection>
  );
}

/**
 * Billing-period selector on the app's real HeroUI `Switch` (controlled).
 * "Monthly"/"Yearly" labels flank the switch and the active period is
 * emphasized; a success Chip advertises the annual saving. Off = monthly,
 * on = yearly. Drives the Premium price shown in the card above.
 */
function BillingToggle({
  yearly,
  onYearlyChange,
}: {
  yearly: boolean;
  onYearlyChange: (yearly: boolean) => void;
}) {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
      <span
        className={`text-sm font-semibold transition-colors ${
          yearly ? "text-muted" : "text-foreground"
        }`}
      >
        Monthly
      </span>

      <Switch
        aria-label="Bill yearly instead of monthly"
        isSelected={yearly}
        onChange={onYearlyChange}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>

      <span
        className={`text-sm font-semibold transition-colors ${
          yearly ? "text-foreground" : "text-muted"
        }`}
      >
        Yearly
      </span>

      <Chip intent="success" variant="soft" size="sm">
        Save 33%
      </Chip>
    </div>
  );
}

/** A single plan benefit with the hero's accent check dot. */
function Benefit({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"
        style={{
          backgroundColor: "color-mix(in oklab, var(--accent) 22%, transparent)",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4 10-10"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-sm leading-relaxed text-foreground">{children}</span>
    </li>
  );
}

/** Day 1: an open padlock (full access unlocked). */
function UnlockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </svg>
  );
}

/** Day 5: a reminder bell. */
function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

/** Day 7: a finish flag (the trial ends). */
function FlagIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.5 4 2.5 4H5" />
    </svg>
  );
}
