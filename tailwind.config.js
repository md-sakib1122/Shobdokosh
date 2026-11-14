/** @type {import('tailwindcss').Config} */
// Every colour, font, size, radius and duration resolves to a DESIGN.md token
// (src/styles/tokens.css). No hex values belong in src/.
const v = (name) => `var(--${name})`;
const fn = (k, keys) => Object.fromEntries(keys.map((x) => [x, v(`${k}-${x}`)]));

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      background: v("background"),
      surface: { DEFAULT: v("surface"), hover: v("surface-hover"), active: v("surface-active") },
      border: {
        DEFAULT: v("border"), subtle: v("border-subtle"), strong: v("border-strong"), interactive: v("border-interactive"),
      },
      rule: v("rule"),
      focus: v("focus-ring"),
      text: { DEFAULT: v("text"), secondary: v("text-secondary") },
      accent: {
        "bg-subtle": v("accent-bg-subtle"), solid: v("accent-solid"), "solid-hover": v("accent-solid-hover"),
        text: v("accent-text"), "on-solid": v("accent-on-solid"),
        ...fn("accent", ["2", "3", "4", "5", "6", "7"]),
      },
      error: fn("error", ["3", "9", "11"]),
      success: fn("success", ["3", "9", "11"]),
      warning: fn("warning", ["3", "9", "11"]),
      info: fn("info", ["3", "9", "11"]),
    },
    fontFamily: { display: v("font-display"), body: v("font-body"), bn: v("font-bn") },
    fontSize: Object.fromEntries(
      ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"].map((k) => [k, [v(`text-${k}`), { lineHeight: v(`leading-${k}`) }]]),
    ),
    fontWeight: { normal: "400", medium: "500", semibold: "600" },
    borderRadius: { none: "0", sm: v("radius-sm"), DEFAULT: v("radius-md"), md: v("radius-md"), lg: v("radius-lg"), badge: v("radius-badge"), full: "9999px" },
    boxShadow: { none: "none", dialog: v("shadow-dialog"), toast: v("shadow-toast") },
    extend: {
      transitionDuration: { micro: v("duration-micro"), standard: v("duration-standard"), large: v("duration-large") },
      transitionTimingFunction: { out: v("ease-out"), in: v("ease-in") },
      maxWidth: { content: v("content-max") },
      minHeight: { control: v("control-h") },
      minWidth: { control: v("control-h") },
      lineHeight: { bn: v("leading-bn"), display: v("leading-display") },
    },
  },
  plugins: [],
};
