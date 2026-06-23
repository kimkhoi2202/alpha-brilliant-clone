import { useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";

import { useAuth } from "./lib/AuthContext";
import { router } from "./router";

function RouteSplash() {
  return (
    <div className="grid min-h-svh place-items-center bg-background text-foreground">
      <div
        className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  // Re-run route guards whenever the auth identity changes (sign in / out).
  useEffect(() => {
    void router.invalidate();
  }, [auth.user]);

  if (auth.loading) return <RouteSplash />;

  return <RouterProvider router={router} context={{ auth }} />;
}
