import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "@heroui/react";

import "@fontsource-variable/outfit";
import "katex/dist/katex.min.css";
import "./styles/globals.css";

import App from "./App.tsx";
import { AuthProvider } from "./lib/AuthContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      {/* App-wide toast region, pinned bottom-left (e.g. Koji voice errors). */}
      <ToastProvider placement="bottom start" />
    </AuthProvider>
  </StrictMode>,
);
