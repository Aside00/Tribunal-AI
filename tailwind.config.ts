import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F3F5F7",
        card: "#FFFFFF",
        line: "#DFE5EB",
        ink: "#17222C",
        muted: "#62717F",
        accent: "#1D5BD6",
        flag: "#D93636",
        allow: "#0F8A5F",
        escalate: "#B97509"
      },
      fontFamily: {
        display: ["Archivo", "IBM Plex Sans Arabic", "sans-serif"],
        body: ["IBM Plex Sans Arabic", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,34,44,0.05), 0 4px 16px rgba(23,34,44,0.05)"
      }
    }
  },
  plugins: []
};
export default config;
