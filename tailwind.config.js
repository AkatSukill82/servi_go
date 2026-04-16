/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  safelist: [
    "bg-accent", "text-accent", "bg-accent/10", "text-accent-foreground",
    "bg-success", "text-success", "bg-warning", "text-warning", "bg-danger", "text-danger",
    // Dark mode colored badge backgrounds
    "dark:bg-orange-900/30", "dark:bg-yellow-900/30", "dark:bg-blue-900/30",
    "dark:bg-purple-900/30", "dark:bg-indigo-900/30", "dark:bg-sky-900/30",
    "dark:bg-green-900/30", "dark:bg-red-900/30",
    "dark:text-orange-400", "dark:text-yellow-400", "dark:text-blue-400",
    "dark:text-purple-400", "dark:text-indigo-400", "dark:text-sky-400",
    "dark:text-green-400", "dark:text-red-400",
    // Dark text on primary buttons
    "text-primary-foreground",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)"],
        sans:  ["var(--font-inter)"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],      // 11px
        "xs":  ["0.8125rem", { lineHeight: "1.125rem" }],   // 13px
        "sm":  ["0.875rem",  { lineHeight: "1.25rem" }],    // 14px
        "base":["0.9375rem", { lineHeight: "1.5rem" }],     // 15px
        "lg":  ["1.125rem",  { lineHeight: "1.75rem" }],    // 18px
        "xl":  ["1.25rem",   { lineHeight: "1.75rem" }],    // 20px
        "2xl": ["1.5rem",    { lineHeight: "2rem" }],       // 24px
        "3xl": ["1.75rem",   { lineHeight: "2.25rem" }],    // 28px
        "4xl": ["2rem",      { lineHeight: "2.5rem" }],     // 32px
      },
      letterSpacing: {
        "heading": "-0.02em",
      },
      borderRadius: {
        sm:   "8px",
        DEFAULT: "12px",
        md:   "12px",
        lg:   "16px",
        xl:   "24px",
        pill:  "9999px",
      },
      spacing: {
        "safe-b": "env(safe-area-inset-bottom)",
        "safe-t": "env(safe-area-inset-top)",
      },
      boxShadow: {
        card:  "0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.06)",
        float: "0 4px 16px rgba(15,23,42,0.12)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "#4F46E5",
          foreground: "#FFFFFF",
          hover:   "#4338CA",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success:  "#10B981",
        warning:  "#F59E0B",
        danger:   "#EF4444",
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
        chip:   "var(--color-chip-bg)",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fade-in":        "fade-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
