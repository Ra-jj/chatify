import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();


  useEffect(() => {
    checkAuth();
  }, [checkAuth]);


  if (isCheckingAuth && !authUser)
    return (
      <div data-theme={theme} className="flex h-[100dvh] items-center justify-center">
        <Loader className="size-8 text-base-content/75 motion-safe:animate-spin" aria-label="Loading" />
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>

      <Toaster
        toastOptions={{
          // Inline styles, because react-hot-toast's own inline white background would beat classes.
          // The CSS variables resolve against the data-theme wrapper above.
          style: {
            background: "oklch(var(--b1))",
            color: "oklch(var(--bc))",
            border: "1px solid color-mix(in oklab, oklch(var(--bc)) 12%, transparent)",
            borderRadius: "0.75rem",
            fontSize: "14px",
          },
        }}
      />
    </div>
  );
};
export default App;
