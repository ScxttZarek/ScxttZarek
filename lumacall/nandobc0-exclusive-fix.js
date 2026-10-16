const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}
function write(path, source) {
  fs.writeFileSync(path, source);
}
function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error("NandoBC0: trecho não encontrado - " + label);
  return source.replace(from, to);
}

// Backend seguro: terceiro nome reservado, código vindo apenas da env.
{
  const path = "lib/reserved-name-server.ts";
  let src = read(path);

  src = mustReplace(
    src,
    'export type ReservedBadge = "creator" | "editor";',
    'export type ReservedBadge = "creator" | "editor" | "imperio_sohlar";',
    "tipo da tag",
  );

  src = mustReplace(
    src,
    '  canonicalName: "OHenrique" | "UserQubo";',
    '  canonicalName: "OHenrique" | "UserQubo" | "NandoBC0";',
    "nomes reservados",
  );

  src = mustReplace(
    src,
    '  codeEnv: "RESERVED_OHENRIQUE_CODE" | "RESERVED_USERQUBO_CODE";',
    '  codeEnv: "RESERVED_OHENRIQUE_CODE" | "RESERVED_USERQUBO_CODE" | "RESERVED_NANDOBC0_CODE";',
    "env reservada",
  );

  src = mustReplace(
    src,
    '  { canonicalName: "UserQubo", badge: "editor", codeEnv: "RESERVED_USERQUBO_CODE" },',
    '  { canonicalName: "UserQubo", badge: "editor", codeEnv: "RESERVED_USERQUBO_CODE" },\n  { canonicalName: "NandoBC0", badge: "imperio_sohlar", codeEnv: "RESERVED_NANDOBC0_CODE" },',
    "registro reservado",
  );

  write(path, src);
}

// Modal de nome reservado.
{
  const path = "components/ui/name-modal.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    '  if (normalized === "userqubo") return { name: "UserQubo", label: "Editor" };',
    '  if (normalized === "userqubo") return { name: "UserQubo", label: "Editor" };\n  if (normalized === "nandobc0") return { name: "NandoBC0", label: "Império Sohlar" };',
    "modal do nome",
  );

  write(path, src);
}

// Home e pré-entrada reconhecem o novo nome como reservado.
for (const path of ["components/home/home-client.tsx", "components/call/pre-join.tsx"]) {
  let src = read(path);
  const before = '["ohenrique", "userqubo"]';
  const after = '["ohenrique", "userqubo", "nandobc0"]';
  if (!src.includes(before)) throw new Error("NandoBC0: lista reservada ausente em " + path);
  src = src.replaceAll(before, after);
  write(path, src);
}

// Tile principal: tag dourada/âmbar.
{
  const path = "components/call/participant-tile.tsx";
  let src = read(path);
  src = src.replaceAll('"creator" | "editor"', '"creator" | "editor" | "imperio_sohlar"');

  const anchor = '{badge === "editor" && <span title="Editor" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/[.14] px-2.5 py-1 text-[10px] font-bold tracking-[.08em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,.12)] backdrop-blur-md"><Scissors className="size-3" />EDITOR</span>}';
  const addition = anchor + '\n        {badge === "imperio_sohlar" && <span title="Império Sohlar" className="inline-flex shrink-0 items-center rounded-full border border-amber-300/30 bg-amber-400/[.14] px-2.5 py-1 text-[9px] font-bold tracking-[.06em] text-amber-100 shadow-[0_0_18px_rgba(251,191,36,.12)] backdrop-blur-md">IMPÉRIO SOHLAR</span>}';

  if (src.includes(anchor)) src = src.replace(anchor, addition);
  else {
    const fallback = '{badge === "editor" && <span title="Editor"';
    const i = src.indexOf(fallback);
    if (i < 0) throw new Error("NandoBC0: tag Editor não encontrada no participant tile.");
    const end = src.indexOf('</span>}', i);
    if (end < 0) throw new Error("NandoBC0: fim da tag Editor não encontrado.");
    const pos = end + '</span>}'.length;
    src = src.slice(0, pos) + '\n        {badge === "imperio_sohlar" && <span title="Império Sohlar" className="inline-flex shrink-0 items-center rounded-full border border-amber-300/30 bg-amber-400/[.14] px-2.5 py-1 text-[9px] font-bold tracking-[.06em] text-amber-100 shadow-[0_0_18px_rgba(251,191,36,.12)] backdrop-blur-md">IMPÉRIO SOHLAR</span>}' + src.slice(pos);
  }

  write(path, src);
}

// Painel de participantes.
{
  const path = "components/call/participants-panel.tsx";
  let src = read(path);
  src = src.replaceAll('"creator" | "editor"', '"creator" | "editor" | "imperio_sohlar"');

  const marker = '{meta(participant).badge === "editor" && <span title="Editor"';
  const i = src.indexOf(marker);
  if (i < 0) throw new Error("NandoBC0: tag Editor não encontrada no painel.");
  const end = src.indexOf('</span>}', i);
  if (end < 0) throw new Error("NandoBC0: fim da tag Editor não encontrado no painel.");
  const pos = end + '</span>}'.length;
  src = src.slice(0, pos) + '{meta(participant).badge === "imperio_sohlar" && <span title="Império Sohlar" className="inline-flex shrink-0 items-center rounded-md bg-amber-300/10 px-1.5 py-0.5 text-[8px] font-semibold text-amber-200">IMPÉRIO SOHLAR</span>}' + src.slice(pos);

  write(path, src);
}

// Chat: nome e tag em dourado.
{
  const path = "components/call/chat-panel.tsx";
  let src = read(path);
  src = src.replaceAll('type Badge = "creator" | "editor";', 'type Badge = "creator" | "editor" | "imperio_sohlar";');

  src = mustReplace(
    src,
    '  if (badge === "editor") return "text-cyan-300";\n  return "text-zinc-200";',
    '  if (badge === "editor") return "text-cyan-300";\n  if (badge === "imperio_sohlar") return "text-amber-300";\n  return "text-zinc-200";',
    "cor no chat",
  );

  const editorBlock = `                      {badge === "editor" && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-400/[.12] px-2 py-0.5 text-[8px] font-bold tracking-[.08em] text-cyan-100">
                          <Scissors className="size-2.5" /> EDITOR
                        </span>
                      )}`;

  const sohlarBlock = editorBlock + `

                      {badge === "imperio_sohlar" && (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-amber-300/25 bg-amber-400/[.12] px-2 py-0.5 text-[8px] font-bold tracking-[.06em] text-amber-100">
                          IMPÉRIO SOHLAR
                        </span>
                      )}`;

  src = mustReplace(src, editorBlock, sohlarBlock, "tag no chat");
  write(path, src);
}

// Compartilhamento de tela também mostra a identidade.
{
  const path = "components/call/screen-share-view.tsx";
  let src = read(path);
  src = src.replaceAll('let badge: "creator" | "editor" | undefined;', 'let badge: "creator" | "editor" | "imperio_sohlar" | undefined;');

  const editorBlock = `            {badge === "editor" && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-400/[.14] px-2 py-1 text-[9px] font-bold tracking-[.07em] text-cyan-100">
                <Scissors className="size-3" />EDITOR
              </span>
            )}`;

  const sohlarBlock = editorBlock + `
            {badge === "imperio_sohlar" && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-amber-300/30 bg-amber-400/[.14] px-2 py-1 text-[9px] font-bold tracking-[.06em] text-amber-100">
                IMPÉRIO SOHLAR
              </span>
            )}`;

  src = mustReplace(src, editorBlock, sohlarBlock, "tag na transmissão");
  write(path, src);
}
