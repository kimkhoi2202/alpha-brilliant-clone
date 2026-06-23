import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useAuth } from "../../lib/AuthContext";
import { useStreak } from "../../hooks/useStreak";
import { MenuDivider, MenuItem, MenuPanel } from "../auth";
import { Counter } from "../ui";
import { Brand } from "./brand";
import { HeaderMenuButton } from "./header-menu-button";
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
        <div className="absolute right-0 top-full z-50 mt-2">
          <MenuPanel>
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

/** The signed-in top bar: brand (home), streak counter, account menu. */
export function AppHeader() {
  const navigate = useNavigate();
  const { currentStreak } = useStreak();

  return (
    <TopNav
      brand={<Brand onPress={() => navigate({ to: "/" })} />}
      endContent={
        <>
          <Counter
            value={currentStreak}
            icon={<span aria-hidden>⚡</span>}
            aria-label={`${currentStreak} day streak`}
          />
          <AccountMenu />
        </>
      }
    />
  );
}
