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
      {/* App-wide toast region. Pinned top-center and above the panel z-index so
          it clears the bottom-left Koji sheet (a bottom-start toast renders
          behind it and looks like it instantly vanishes). */}
      <ToastProvider placement="top" className="z-[80]" />
    </AuthProvider>
  </StrictMode>,
);
