import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import MotionProvider from "./components/MotionProvider.jsx";

import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Opts in to the v7 behaviour now, which also silences the dev-console warnings. No
        route is a splat (*) route, so relative links resolve the same either way. */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MotionProvider>
        <App />
      </MotionProvider>
    </BrowserRouter>
  </StrictMode>
);
