import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
  background: "#0B0B0B",
  surface: "#151313",
  panel: "#1D1918",

  bronze: "#8B6A4A",
  gold: "#C8A46A",
  parchment: "#D6C2A1",

  success: "#4D8B55",
  danger: "#A94141",
  warning: "#C78A2F",

  border: "#3A3028",
  text: "#EEE7DD",
  muted: "#8E8275"
},
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
        body: ["'Inter'", "sans-serif"]
      }
    }
  },
  plugins: []
};
export default config;
