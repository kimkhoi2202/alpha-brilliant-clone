import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useAuth } from "../../lib/AuthContext";
import { useStreak } from "../../hooks/useStreak";
import { useLearner } from "../../lib/learner";
import { lessonOrder } from "../../content";
import { MenuDivider, MenuItem, MenuPanel } from "../auth";
import { Brand } from "./brand";
import { HeaderMenuButton } from "./header-menu-button";
import { StreakMenu } from "./streak-menu";
import { TopNav } from "./top-nav";

function HomeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.86768 1.19904C8.36836 0.771054 7.63156 0.771055 7.13224 1.19904L1.13224 6.3419C0.83671 6.59521 0.666626 6.96501 0.666626 7.35424V14.6667C0.666626 15.403 1.26358 16 1.99996 16L6.33333 16H9.66667L14 16C14.7331 16 15.3333 15.4087 15.3333 14.6691V7.35298C15.3333 6.96239 15.1622 6.59432 14.8677 6.3419L8.86768 1.19904ZM10.6667 14.6667H14V7.35424L7.99996 2.21139L1.99996 7.35424V14.6667H5.33333V10.3333C5.33333 9.78105 5.78105 9.33333 6.33333 9.33333H9.66667C10.219 9.33333 10.6667 9.78105 10.6667 10.3333V14.6667ZM6.66667 14.6667H9.33333V10.6667H6.66667V14.6667Z"
      />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg viewBox="0 0 17 17" fill="currentColor" className="size-4" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.68251 2.87297C5.00079 1.40536 6.48945 0.508958 7.93546 0.914182L14.5221 2.75999C15.8941 3.14447 16.7215 4.5396 16.4008 5.9279L14.88 12.5116C14.7972 12.8703 14.4392 13.094 14.0804 13.0111C13.7217 12.9282 13.498 12.5702 13.5809 12.2115L15.1016 5.62782C15.262 4.93367 14.8483 4.2361 14.1623 4.04386L7.57568 2.19806C6.86883 1.99997 6.14114 2.43816 5.98555 3.15556C5.90752 3.51538 5.55256 3.74382 5.19273 3.66578C4.83291 3.58775 4.60447 3.23279 4.68251 2.87297Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 6.33337C0 5.2288 0.895431 4.33337 2 4.33337H10.6667C11.7712 4.33337 12.6667 5.2288 12.6667 6.33337V15C12.6667 16.1046 11.7712 17 10.6667 17H2C0.895431 17 0 16.1046 0 15V6.33337ZM2 5.66671C1.63181 5.66671 1.33333 5.96518 1.33333 6.33337V15C1.33333 15.3682 1.63181 15.6667 2 15.6667H10.6667C11.0349 15.6667 11.3333 15.3682 11.3333 15V6.33337C11.3333 5.96518 11.0349 5.66671 10.6667 5.66671H2Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.33326 13.2618L3.19519 11.1238L4.138 10.1809L5.33326 11.3762L8.19519 8.51428L9.138 9.45709L5.33326 13.2618Z"
      />
    </svg>
  );
}

function ComponentsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

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
                void navigate({ to: "/profile" });
              }}
            >
              Profile
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
  const { lessonStatus } = useLearner();
  const lessonsComplete = lessonOrder.filter(
    (id) => lessonStatus(id) === "completed",
  ).length;

  return (
    <TopNav
      brand={<Brand onPress={() => navigate({ to: "/" })} />}
      tabs={[
        {
          id: "home",
          label: "Home",
          icon: <HomeIcon />,
          onPress: () => void navigate({ to: "/" }),
        },
        {
          id: "courses",
          label: "Courses",
          icon: <CoursesIcon />,
          active: pathname === "/",
          onPress: () => void navigate({ to: "/" }),
        },
        {
          id: "components",
          label: "Components",
          icon: <ComponentsIcon />,
          active: pathname.startsWith("/components"),
          onPress: () => void navigate({ to: "/components" }),
        },
      ]}
      endContent={
        <>
          <StreakMenu
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            lessonsComplete={lessonsComplete}
          />
          <AccountMenu />
        </>
      }
    />
  );
}
