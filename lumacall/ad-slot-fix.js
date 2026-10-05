const fs = require("fs");

const callPath = "components/call/call-room.tsx";
let call = fs.readFileSync(callPath, "utf8");

const headerOpen = '<header className="call-header flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/[.06] bg-[#0a0b0d]/92 px-3 backdrop-blur-xl sm:px-4">';
if (!call.includes(headerOpen)) throw new Error("Cabeçalho da call não encontrado para inserir anúncio.");

call = call.replace(
  headerOpen,
  '<header className="call-header relative flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/[.06] bg-[#0a0b0d]/92 px-3 backdrop-blur-xl sm:px-4">\n' +
  '        <div className="call-ad-slot pointer-events-none absolute left-1/2 top-1/2 hidden h-8 w-[420px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-white/[.06] bg-white/[.025] text-[9px] font-medium tracking-[.08em] text-zinc-600 xl:flex">PUBLICIDADE • ESPAÇO RESERVADO</div>'
);

fs.writeFileSync(callPath, call);

const cssPath = "app/globals.css";
let css = fs.readFileSync(cssPath, "utf8");
if (!css.includes("/* LunaCall ad slot */")) {
  css += `

/* LunaCall ad slot */
@media (max-width: 1279px) {
  .call-ad-slot {
    display: none !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .call-ad-slot {
    transition: none !important;
  }
}
`;
}
fs.writeFileSync(cssPath, css);
