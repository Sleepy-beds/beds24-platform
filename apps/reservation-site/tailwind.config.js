/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./web/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2b2622",
        sand: "#f6f1e9",
        clay: "#b08968",
        moss: "#5b6c5d",
        accent: "#9c6b4a",
      },
      fontFamily: {
        sans: ['"Hiragino Sans"', '"Noto Sans JP"', "system-ui", "sans-serif"],
        serif: ['"Hiragino Mincho ProN"', '"Noto Serif JP"', "serif"],
      },
    },
  },
  plugins: [],
};
