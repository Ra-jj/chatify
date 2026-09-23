import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // Reserved for the auth hero line and the empty-state headline only
        display: ["Instrument Serif", "serif"],
      },
      keyframes: {
        "typing-dot": {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.35" },
          "30%": { transform: "translateY(-3px)", opacity: "1" },
        },
      },
      animation: {
        "typing-dot": "typing-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    // Order matters: the first theme is applied to :root, and the Settings page
    // lists them in this same order (see src/constants/index.js).
    themes: [
      {
        chatify: {
          "color-scheme": "dark",
          // Indigo-violet sitting between the logo's cyan (#38bdf8) and purple (#a855f7).
          // #7b7bff only reached 3.43:1 with white text; #6262f5 reaches 4.58:1.
          primary: "#6262f5",
          "primary-content": "#ffffff",
          secondary: "#38bdf8",
          "secondary-content": "#0c0c10",
          accent: "#a855f7",
          "accent-content": "#0c0c10",
          neutral: "#1a1a22",
          "neutral-content": "#e6e6eb",
          "base-100": "#0c0c10",
          "base-200": "#15151c",
          "base-300": "#20202a",
          "base-content": "#e6e6eb",
          info: "#38bdf8",
          "info-content": "#0c0c10",
          success: "#34d399",
          "success-content": "#0c0c10",
          warning: "#fbbf24",
          "warning-content": "#0c0c10",
          error: "#f87171",
          "error-content": "#0c0c10",
          "--rounded-box": "0.875rem",
          "--rounded-btn": "0.625rem",
          "--rounded-badge": "9999px",
        },
      },
      "dark",
      "night",
      "dim",
      "business",
      "luxury",
      "light",
      "corporate",
      "nord",
      "emerald",
    ],
    // chatify is already the root theme; stop daisyUI swapping :root to "dark" for OS dark mode
    darkTheme: "chatify",
  },
};
