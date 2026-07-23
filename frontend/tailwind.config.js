import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      "light",
      "dark",
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
      {
        chatify: {
          "color-scheme": "dark",
          primary: "#f59e0b", // amber-500
          "primary-content": "#1c1917", // stone-900
          secondary: "#fbbf24", // amber-400
          "secondary-content": "#1c1917",
          accent: "#0f172a", // slate-900
          "accent-content": "#fde68a", // amber-200
          neutral: "#1e293b", // slate-800
          "neutral-content": "#f1f5f9", // slate-100
          "base-100": "#0b1220", // deep slate (page bg)
          "base-200": "#111a2e", // sidebar / panels
          "base-300": "#1c2742", // borders, hovers
          "base-content": "#e2e8f0", // slate-200
          info: "#38bdf8",
          success: "#84cc16",
          warning: "#f59e0b",
          error: "#ef4444",
          "--rounded-box": "0.5rem",
          "--rounded-btn": "0.375rem",
          "--rounded-badge": "0.375rem",
        },
      },
    ],
  },
};
