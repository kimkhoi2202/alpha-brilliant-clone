import { useNavigate } from "@tanstack/react-router";

import { HeaderMenuButton, TopNav } from "../components/chrome";
import { Counter } from "../components/ui";

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2z" />
      <path d="M18 3v16" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16l-1.8-4.5L5 9.7l5.2-1.8L12 3Z" />
      <path d="M19 14l.9 2.4L22 17l-2.1.8L19 20l-.9-2.2L16 17l2.1-.6L19 14Z" />
    </svg>
  );
}

/** Shared top bar for the dev showcase routes (Components ⇄ Animations). */
export function DevTopNav({ active }: { active: "components" | "animations" }) {
  const navigate = useNavigate();

  return (
    <TopNav
      tabs={[
        {
          id: "components",
          label: "Components",
          icon: <BookIcon />,
          active: active === "components",
          onPress: () => void navigate({ to: "/components" }),
        },
        {
          id: "animations",
          label: "Animations",
          icon: <SparkleIcon />,
          active: active === "animations",
          onPress: () => void navigate({ to: "/dev" }),
        },
      ]}
      endContent={
        <>
          <Counter
            value={1}
            icon={<span aria-hidden>⚡</span>}
            aria-label="1 energy"
          />
          <HeaderMenuButton />
        </>
      }
    />
  );
}
