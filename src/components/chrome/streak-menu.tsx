import { useEffect, useRef, useState } from "react";

import { cn } from "../../lib/cn";
import { Counter } from "../ui/counter";
import { StreakBolt } from "./streak-bolt";
import { StreakDayDisc } from "./streak-day-disc";

export interface StreakMenuProps {
  currentStreak: number;
  longestStreak: number;
  lessonsComplete: number;
}

const WEEKDAYS = ["M", "T", "W", "Th", "F"] as const;

/** JS getDay() (0=Sun) → Mon–Fri index (0–4); weekend clamps to Fri. */
function todayWeekday(): { idx: number; isWeekday: boolean } {
  const mon0 = (new Date().getDay() + 6) % 7; // 0 Mon … 6 Sun
  return mon0 <= 4 ? { idx: mon0, isWeekday: true } : { idx: 4, isWeekday: false };
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-bold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

/**
 * The streak pill plus Brilliant's streak popover (current week, max streak,
 * lessons complete). The pill itself carries the interactive hover.
 */
export function StreakMenu({
  currentStreak,
  longestStreak,
  lessonsComplete,
}: StreakMenuProps) {
  const [open, setOpen] = useState(false);
  // Keep the panel mounted while it plays its exit animation, then unmount.
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Mount immediately on open; the exit animation's onAnimationEnd unmounts.
  function toggleMenu() {
    if (open) {
      setOpen(false);
    } else {
      setMounted(true);
      setOpen(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { idx: todayIdx, isWeekday } = todayWeekday();

  return (
    <div ref={ref} className="relative">
      {/* Brilliant-style pill: the day count next to the streak bolt. */}
      <Counter
        value={currentStreak}
        icon={
          <StreakBolt completed={currentStreak > 0} className="streak-bolt-pulse" />
        }
        onPress={toggleMenu}
        isActive={open}
        aria-label={`${currentStreak} day streak`}
      />

      {mounted ? (
        <div
          role="dialog"
          aria-label="Streak details"
          data-state={open ? "open" : "closed"}
          onAnimationEnd={(event) => {
            // Ignore bubbling child animations (e.g. the weekday discs); only
            // unmount once the panel's own exit animation has finished.
            if (event.target !== event.currentTarget) return;
            if (!open) setMounted(false);
          }}
          className="streak-popover absolute right-0 top-full z-50 mt-3 w-[320px]"
        >
          <span
            aria-hidden
            style={{ color: "var(--overlay)" }}
            className="pointer-events-none absolute -top-2 right-4 drop-shadow-[0_0_6px_rgba(0,0,0,0.35)]"
          >
            <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
              <path
                d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H17.8683C16.8801 8 15.9269 7.63423 15.1924 6.97318L10.3356 2.60207C10.0708 2.3636 9.92918 2.3636 9.66437 2.60207Z"
                fill="currentColor"
              />
            </svg>
          </span>

          <div className="overflow-hidden rounded-2xl bg-overlay p-5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-1.5">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {currentStreak}
              </span>
              <StreakBolt completed={currentStreak > 0} className="h-8 w-6" />
            </div>

            <p className="mt-3 text-foreground">
              {currentStreak > 0
                ? `You're on a ${currentStreak}-day streak!`
                : "Start a streak today!"}
            </p>

            <div className="mt-4 flex w-full justify-between">
              {WEEKDAYS.map((label, i) => {
                const done = i <= todayIdx && todayIdx - i < currentStreak;
                const isToday = isWeekday && i === todayIdx;
                return (
                  <div
                    key={label}
                    className="streak-disc flex flex-col items-center gap-2"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <StreakDayDisc state={done ? "done" : "upcoming"} />
                    <span
                      className={cn(
                        "text-sm",
                        isToday ? "font-bold text-foreground" : "text-muted",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center rounded-lg bg-default/50 py-4">
              <div className="flex flex-1 justify-center">
                <Stat value={longestStreak} label="Max streak" />
              </div>
              <div className="h-8 w-px bg-border" aria-hidden />
              <div className="flex flex-1 justify-center">
                <Stat value={lessonsComplete} label="Lessons complete" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
