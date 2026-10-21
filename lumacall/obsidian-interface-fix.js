const fs = require("fs");
const path = require("path");

function replaceUnique(file, from, to, label) {
  const source = fs.readFileSync(file, "utf8");
  if (source.split(from).length !== 2) {
    throw new Error("LumaCall Obsidian: âncora ausente/duplicada em " + label);
  }
  fs.writeFileSync(file, source.replace(from, to));
}

// Executar somente após todos os patches anteriores. Nenhuma função de chamada é modificada.
replaceUnique(
  "components/call/pre-join.tsx",
  '<main className="min-h-dvh px-4 sm:px-6">',
  '<main className="lc-prejoin min-h-dvh px-4 sm:px-6">',
  "pré-entrada"
);
replaceUnique(
  "components/call/call-room.tsx",
  'className="mobile-call relative flex h-full flex-col bg-[#08090b]"',
  'className="lc-call mobile-call relative flex h-full flex-col bg-[#08090b]"',
  "sala"
);
replaceUnique(
  "components/call/participant-tile.tsx",
  'group relative overflow-hidden rounded-2xl border bg-[#0d0e11] transition',
  'lc-participant-tile group relative overflow-hidden rounded-2xl border bg-[#0d0e11] transition',
  "tile"
);
replaceUnique(
  "components/call/screen-share-view.tsx",
  'className="screen-share-frame flex h-full w-full flex-col',
  'className="lc-screen-share screen-share-frame flex h-full w-full flex-col',
  "compartilhamento"
);
replaceUnique(
  "components/ui/name-modal.tsx",
  'className="glass relative w-full max-w-[420px] rounded-3xl p-7"',
  'className="lc-profile-modal glass relative w-full max-w-[420px] rounded-3xl p-7"',
  "perfil"
);

// Arte vetorial local (sem dependência nem fontes externas); mantém as imagens reservadas intactas.
fs.mkdirSync("public/icons", { recursive: true });
fs.copyFileSync("lumacall-obsidian-mark.svg", "public/icons/lumacall-obsidian-mark.svg");
replaceUnique(
  "app/layout.tsx",
  'icon: "/icons/lumacall-192.png",',
  'icon: "/icons/lumacall-obsidian-mark.svg",',
  "ícone da aba"
);

const stylesPath = "app/globals.css";
const css = fs.readFileSync(stylesPath, "utf8");
const theme = fs.readFileSync("lumacall-obsidian.css", "utf8");
const marker = "/* LumaCall Obsidian UI";
if (!theme.startsWith(marker)) throw new Error("Tema Obsidian inválido");
if (!css.includes(marker)) fs.writeFileSync(stylesPath, css + "\n\n" + theme + "\n");
