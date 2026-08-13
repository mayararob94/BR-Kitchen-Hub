import type { Config } from "tailwindcss";

// Palette reused from the MEALzinha online project so branding stays consistent
// and a future merge is trivial. Trimmed to what this operations tool needs.
const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          50: "#FAF8F6",
          100: "#F3F0ED",
          200: "#E6E1DC",
          300: "#D1CAC3",
          400: "#AEA49B",
          500: "#6E635B",
          600: "#6E635B",
          700: "#4A413A",
          800: "#332B26",
          900: "#221C18",
          950: "#13100E",
        },
        brand: {
          50: "#fff7f0",
          100: "#ffecdb",
          200: "#ffd6b5",
          300: "#ffba85",
          400: "#ffa366",
          500: "#ff914d",
          600: "#ed7531",
          700: "#c55a1e",
          800: "#9c4819",
          900: "#7e3c18",
          950: "#441d09",
        },
        tropical: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#b0f0c8",
          300: "#6ddc96",
          400: "#3dc872",
          500: "#2DB55D",
          600: "#1f9449",
          700: "#197539",
          800: "#165c2e",
          900: "#134c27",
          950: "#082b15",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
