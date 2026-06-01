import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1A365D",
        "primary-light": "#2A4A7F",
        accent: "#C8913A",
        "accent-light": "#D4A855",
        warm: "#F5F3F0",
        correct: "#10B981",
        "correct-light": "#D1FAE5",
        wrong: "#EF4444",
        "wrong-light": "#FEE2E2",
        "text-primary": "#1A202C",
        "text-secondary": "#718096",
      },
      borderRadius: {
        card: "1rem",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans SC"',
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
