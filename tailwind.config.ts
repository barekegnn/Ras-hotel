import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ras Hotel brand palette — warm terracotta, deep harar teal, sand
        brand: {
          50:  "#fdf6f0",
          100: "#fae8d8",
          200: "#f5cdb0",
          300: "#eeaa7e",
          400: "#e5844a",
          500: "#d96428",  // primary terracotta
          600: "#c04e1e",
          700: "#9e3c1a",
          800: "#7f311c",
          900: "#682b1a",
          950: "#38130a",
        },
        harar: {
          50:  "#f0f9f7",
          100: "#d9f0ea",
          200: "#b4e0d6",
          300: "#81c8bc",
          400: "#4dab9e",
          500: "#2e9083",  // harar teal
          600: "#247469",
          700: "#205e55",
          800: "#1e4c45",
          900: "#1c3f3a",
          950: "#0b2421",
        },
        sand: {
          50:  "#fdfaf5",
          100: "#f9f0df",
          200: "#f1ddb5",
          300: "#e7c47f",
          400: "#daa84e",
          500: "#ce8f2e",
          600: "#b27224",
          700: "#8f5621",
          800: "#744624",
          900: "#603b21",
          950: "#361e0e",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Room status colours
        "room-available":  "#22c55e",   // green-500
        "room-occupied":   "#ef4444",   // red-500
        "room-reserved-paid":   "#3b82f6",   // blue-500
        "room-reserved-unpaid": "#eab308",   // yellow-500
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-from-top": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in": "slide-in-from-top 0.25s ease-out",
        "pulse-slow": "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
