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
import { HomeScreen } from "./routes/HomeScreen";
import { InfinitePractice } from "./routes/InfinitePractice";
import { Landing } from "./routes/Landing";
import { LessonPlayer } from "./routes/LessonPlayer";
import { MedallionScaleScreen } from "./routes/MedallionScaleScreen";
import { ReviewSession } from "./routes/ReviewSession";
import { SettingsScreen } from "./routes/SettingsScreen";
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

// The signed-in Home (daily cockpit) is the app's "/".
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: ({ context }) => requireAuth(context),
  component: HomeScreen,
});

// The course map (lesson path) lives at /courses.
const courseMapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/courses",
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

// Account settings (profile, password, security, notifications, delete account).
// Kept reachable at the legacy /profile path as well as the canonical /settings.
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  beforeLoad: ({ context }) => requireAuth(context),
  component: SettingsScreen,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  beforeLoad: ({ context }) => requireAuth(context),
  component: SettingsScreen,
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

// Spaced-review session (Phase 3): due-skill reviews, or a single-skill
// corrective set via `?skill=<id>`. Auth-guarded; AI-off-safe (hand-authored
// content), so it works with the model off.
const reviewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reviews",
  validateSearch: (search: Record<string, unknown>): { skill?: string } => ({
    skill: typeof search.skill === "string" ? search.skill : undefined,
  }),
  beforeLoad: ({ context }) => requireAuth(context),
  component: ReviewSession,
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
  homeRoute,
  courseMapRoute,
  lessonRoute,
  settingsRoute,
  profileRoute,
  practiceRoute,
  reviewsRoute,
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
