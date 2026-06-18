/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#07101F",
        orange: "#F97316",
        cream: "#EFE6C8",
        soft: "#F8F4EA",
      },
    },
  },
  plugins: [],
};