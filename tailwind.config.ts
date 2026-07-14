import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0D1520",
        panel: "#131F2E",
        panel2: "#0F1926",
        line: "#23364A",
        fg: "#E8EDF4",
        muted: "#8FA3B8",
        signal: "#53C8F0",
        flag: "#FF5D5D",
        allow: "#43D9A3",
        escalate: "#FFB454"
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
