import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        // Warm institutional palette (used only by the /portal platform).
        sand: {
          50: "#FBF8F2",
          100: "#F5EEE3",
          200: "#EAE0D0",
          300: "#D9C9B2",
          400: "#C7B294",
        },
        ink: {
          DEFAULT: "#241F1A",
          soft: "#5A5147",
          faint: "#8C8273",
        },
        clay: {
          100: "#F4E5DA",
          500: "#B4623B",
          600: "#9A5230",
          700: "#7E4427",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "Cambria", "serif"],
        ui: [
          "var(--font-ui)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
