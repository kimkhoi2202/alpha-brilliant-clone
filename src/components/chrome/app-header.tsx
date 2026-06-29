import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useAuth } from "../../lib/AuthContext";
import { useStreak } from "../../hooks/useStreak";
import { useLearner } from "../../lib/learner";
import { lessonOrder } from "../../content";
import { today } from "../../lib/date";
import { MenuDivider, MenuItem, MenuPanel } from "../auth";
import { LottieIcon } from "../visuals";
import { Brand } from "./brand";
import { HeaderMenuButton } from "./header-menu-button";
import { StreakMenu } from "./streak-menu";
import { toStreakDays } from "./streak-days";
import { TopNav } from "./top-nav";

function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

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

  return (
    <div ref={ref} className="relative">
      <HeaderMenuButton
        isOpen={open}
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
      />
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-3">
          <MenuPanel arrow="end">
            <MenuItem
              onPress={() => {
                setOpen(false);
                void navigate({ to: "/settings" });
              }}
            >
              Settings
            </MenuItem>
            <MenuDivider />
            <MenuItem
              danger
              onPress={() => {
                setOpen(false);
                void logout();
              }}
            >
              Sign out
            </MenuItem>
          </MenuPanel>
        </div>
      ) : null}
    </div>
  );
}

/** The signed-in top bar: brand, Home/Courses tabs, Gift Premium, streak, menu. */
export function AppHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { currentStreak, longestStreak } = useStreak();
  const { lessonStatus, weekActivity } = useLearner();
  const lessonsComplete = lessonOrder.filter(
    (id) => lessonStatus(id) === "completed",
  ).length;
  const streakDays = toStreakDays(weekActivity(), today());

  return (
    <TopNav
      brand={<Brand onPress={() => navigate({ to: "/home" })} />}
      tabs={[
        {
          id: "home",
          label: "Home",
          // Animated Lottie home: plays forward on hover/focus, reverses back to
          // its resting frame on leave. Recoloured to currentColor to match.
          icon: ({ active }: { active: boolean }) => (
            <LottieIcon
              path="/lottie/home.json"
              play={active}
              size={22}
              monochrome
            />
          ),
          active: pathname === "/home",
          onPress: () => void navigate({ to: "/home" }),
        },
        {
          id: "courses",
          label: "Courses",
          // Animated Lottie: loops on hover/focus, finishes its cycle on leave.
          icon: ({ active }: { active: boolean }) => (
            <LottieIcon
              path="/lottie/courses.json"
              play={active}
              size={22}
              monochrome
            />
          ),
          active: pathname === "/courses",
          onPress: () => void navigate({ to: "/courses" }),
        },
      ]}
      endContent={
        <>
          <StreakMenu
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            lessonsComplete={lessonsComplete}
            days={streakDays}
          />
          <AccountMenu />
        </>
      }
    />
  );
}
