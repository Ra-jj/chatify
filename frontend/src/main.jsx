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
    <BrowserRouter>
      <MotionProvider>
        <App />
      </MotionProvider>
    </BrowserRouter>
  </StrictMode>
);
