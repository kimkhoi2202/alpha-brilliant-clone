import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import type { AuthContextValue } from "./lib/AuthContext";
import { AnimationsScreen } from "./routes/AnimationsScreen";
import { AuthScreen } from "./routes/AuthScreen";
import { ComponentsScreen } from "./routes/ComponentsScreen";
import { CourseMapScreen } from "./routes/CourseMapScreen";
import { InfinitePractice } from "./routes/InfinitePractice";
import { Landing } from "./routes/Landing";
import { LessonPlayer } from "./routes/LessonPlayer";
import { MedallionScaleScreen } from "./routes/MedallionScaleScreen";
import { ProfileScreen } from "./routes/ProfileScreen";
import { Root } from "./routes/Root";

export type RouterContext = { auth: AuthContextValue };

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

/**
 * Guard for signed-in-only routes: bounce to /auth only when we *know* there's
 * no user.
 *
 * The first beforeLoad pass runs before the provider injects auth (default
 * context), and auth may still be resolving on a hard refresh. In both cases we
 * must wait rather than redirect, otherwise refreshing a guarded URL (e.g.
 * mid-lesson) bounces to /auth, which then sends a logged-in user to "/",
 * losing the page. The guard re-runs with real auth once it's known.
 */
function requireAuth(context: RouterContext): void {
  if (!context.auth || context.auth.loading) return;
  if (!context.auth.user) {
    throw redirect({ to: "/auth" });
  }
}

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  beforeLoad: ({ context }) => {
    if (context.auth?.user) throw redirect({ to: "/" });
  },
  component: AuthScreen,
});

const courseMapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: ({ context }) => requireAuth(context),
  component: CourseMapScreen,
});

// Public marketing landing. Lives at /landing while it's built and reviewed;
// once it's signed off it takes over "/" and the app moves to /home.
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/landing",
  component: Landing,
});

const lessonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lesson/$lessonId",
  beforeLoad: ({ context }) => requireAuth(context),
  component: LessonPlayer,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  beforeLoad: ({ context }) => requireAuth(context),
  component: ProfileScreen,
});

// "Infinite Practice" (Pillar B): verified, adaptive generation, reached after
// the course's level-review. Auth-guarded; the screen itself handles the AI-off
// state, so a direct visit with AI off shows a graceful explainer.
const practiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/practice",
  beforeLoad: ({ context }) => requireAuth(context),
  component: InfinitePractice,
});

const componentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/components",
  component: ComponentsScreen,
});

const devRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dev",
  component: AnimationsScreen,
});

// Unguarded visual sandbox for the lesson-progress medallion spacing.
const medallionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/medallions",
  component: MedallionScaleScreen,
});

const routeTree = rootRoute.addChildren([
  authRoute,
  landingRoute,
  courseMapRoute,
  lessonRoute,
  profileRoute,
  practiceRoute,
  componentsRoute,
  devRoute,
  medallionsRoute,
]);

export const router = createRouter({
  routeTree,
  context: { auth: undefined! },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
