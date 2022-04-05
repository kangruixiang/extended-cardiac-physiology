const colors = require("tailwindcss/colors");

module.exports = {
  darkMode: "media",
  mode: "jit",
  content: ["./docs/index.html", "./src/**/*.svelte"],
  theme: {
    container: {
      center: true,
    },
    fontFamily: {
      sans: ["Concourse", "ui-sans-serif", "system-ui"],
      serif: ["Equity", "ui-serif"],
    },
    extend: {},
  },
  plugins: [require("@tailwindcss/forms")],
};
