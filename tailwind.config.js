/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        bangla: ['"Hind Siliguri"', '"Noto Sans Bengali"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
