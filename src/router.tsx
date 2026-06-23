import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import type { AuthContextValue } from "./lib/AuthContext";
import { AuthScreen } from "./routes/AuthScreen";
import { ComponentsScreen } from "./routes/ComponentsScreen";
import { CourseMapScreen } from "./routes/CourseMapScreen";
import { LessonPlayer } from "./routes/LessonPlayer";
import { ProfileScreen } from "./routes/ProfileScreen";
import { Root } from "./routes/Root";

export type RouterContext = { auth: AuthContextValue };

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Root,
});

/**
 * Guard for signed-in-only routes: bounce to /auth when there's no user.
 * `auth` is optional-chained because TanStack runs an initial beforeLoad pass
 * with the router's default context (auth not yet injected by the provider).
 */
function requireAuth(context: RouterContext): void {
  if (!context.auth?.user) {
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

const componentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/components",
  component: ComponentsScreen,
});

const routeTree = rootRoute.addChildren([
  authRoute,
  courseMapRoute,
  lessonRoute,
  profileRoute,
  componentsRoute,
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
