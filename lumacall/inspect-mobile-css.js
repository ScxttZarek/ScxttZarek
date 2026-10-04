const fs = require("fs");
const css = fs.readFileSync("app/globals.css", "utf8");
const idx = css.indexOf("@media (max-width: 860px)");
console.log(css.slice(Math.max(0, idx - 300), idx + 1200));
