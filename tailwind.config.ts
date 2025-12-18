import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  // Enable dark mode using class strategy
  darkMode: "class",

  // Paths to all template files
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}", // add if you use pages directory
    "./src/**/*.{ts,tsx}", // optional: if you store components elsewhere
  ],

  theme: {
    extend: {
      // Custom fonts
      fontFamily: {
        sans: [
          "Inter",
          "Roboto",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },

      // Custom box shadows
      boxShadow: {
        soft: "0 2px 10px rgba(0,0,0,0.06)",
      },

      // You can add more custom colors, spacing, etc. here
      colors: {
        primary: "#4f46e5", // example
        secondary: "#ec4899", // example
      },

      spacing: {
        128: "32rem", // example
      },
      
    },
  },

  // Tailwind plugins
  plugins: [typography],
};

export default config;
