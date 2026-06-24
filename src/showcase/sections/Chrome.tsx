import type { ReactNode } from "react";

import {
  FooterCtaBar,
  HeaderMenuButton,
  LessonTopBar,
  TopNav,
  type NavTabItem,
} from "../../components/chrome";
import { Button, Counter } from "../../components/ui";
import { Section, Subhead } from "../Section";

/* Placeholder icons: swapped for real art later. */
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
function Flame() {
  return <span aria-hidden>🔥</span>;
}
function Bolt() {
  return <span aria-hidden>⚡</span>;
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Subhead className="mt-6">{label}</Subhead>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        {children}
      </div>
    </div>
  );
}

const tabs: NavTabItem[] = [
  { id: "home", label: "Home", icon: <HomeIcon /> },
  { id: "courses", label: "Courses", icon: <BookIcon />, active: true },
];

export function Chrome() {
  return (
    <Section
      id="chrome"
      title="App chrome"
      description="The persistent framing: the in-app top nav, the marketing nav, the lesson header, and the sticky footer CTA bar. Icons are placeholders."
    >
      <Frame label="Top nav: in-app">
        <TopNav
          sticky={false}
          tabs={tabs}
          endContent={
            <>
              <Button variant="outline" pill size="sm">
                Go Premium
              </Button>
              <Counter value={2} icon={<Flame />} aria-label="2 day streak" />
              <Counter value={0} icon={<Bolt />} aria-label="0 energy" />
              <HeaderMenuButton />
            </>
          }
        />
      </Frame>

      <Frame label="Top nav: marketing">
        <TopNav
          sticky={false}
          endContent={
            <Button variant="outline" pill size="sm">
              Sign in
            </Button>
          }
        />
      </Frame>

      <Frame label="Lesson top bar">
        <LessonTopBar
          progress={40}
          checkpoints={3}
          endContent={<Counter value={0} icon={<Bolt />} aria-label="0 energy" />}
        />
      </Frame>

      <Frame label="Footer CTA bar: check / continue">
        <div className="grid h-24 place-items-center text-sm text-muted">
          lesson content…
        </div>
        <FooterCtaBar sticky={false}>
          <Button fullWidth>Check</Button>
        </FooterCtaBar>
      </Frame>

      <Frame label="Footer CTA bar: with secondary action">
        <div className="grid h-24 place-items-center text-sm text-muted">
          lesson content…
        </div>
        <FooterCtaBar
          sticky={false}
          startContent={
            <button
              type="button"
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              ↺ Start over
            </button>
          }
        >
          <Button variant="success">Continue</Button>
        </FooterCtaBar>
      </Frame>
    </Section>
  );
}
