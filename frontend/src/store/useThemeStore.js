import { create } from "zustand";
import { THEMES } from "../constants";

const DEFAULT_THEME = "chatify";

// A theme saved before the theme list was trimmed (e.g. "cupcake") no longer has CSS,
// so anything not in THEMES falls back to the default.
const readSavedTheme = () => {
  const savedTheme = localStorage.getItem("chat-theme");
  return THEMES.includes(savedTheme) ? savedTheme : DEFAULT_THEME;
};

export const useThemeStore = create((set) => ({
  theme: readSavedTheme(),
  setTheme: (theme) => {
    localStorage.setItem("chat-theme", theme);
    set({ theme });
  },
}));
