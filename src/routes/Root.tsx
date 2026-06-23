import { Outlet } from "@tanstack/react-router";

import { LearnerProvider } from "../lib/learner";

export function Root() {
  return (
    <LearnerProvider>
      <Outlet />
    </LearnerProvider>
  );
}
