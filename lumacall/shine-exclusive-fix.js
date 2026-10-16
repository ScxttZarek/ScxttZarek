const fs = require("fs");

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, source) { fs.writeFileSync(path, source); }
function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error("Shine: trecho não encontrado - " + label);
  return source.replace(from, to);
}

// Backend seguro do nome reservado.
{
  const path = "lib/reserved-name-server.ts";
  let src = read(path);

  src = mustReplace(
    src,
    'export type ReservedBadge = "creator" | "editor" | "imperio_sohlar";',
    'export type ReservedBadge = "creator" | "editor" | "imperio_sohlar" | "princesa_tess";',
    "tipo da tag",
  );

  src = mustReplace(
    src,
    '  canonicalName: "OHenrique" | "UserQubo" | "NandoBC0";',
    '  canonicalName: "OHenrique" | "UserQubo" | "NandoBC0" | "Shine";',
    "nomes reservados",
  );

  src = mustReplace(
    src,
    '  codeEnv: "RESERVED_OHENRIQUE_CODE" | "RESERVED_USERQUBO_CODE" | "RESERVED_NANDOBC0_CODE";',
    '  codeEnv: "RESERVED_OHENRIQUE_CODE" | "RESERVED_USERQUBO_CODE" | "RESERVED_NANDOBC0_CODE" | "RESERVED_SHINE_CODE";',
    "env reservada",
  );

  src = mustReplace(
    src,
    '  { canonicalName: "NandoBC0", badge: "imperio_sohlar", codeEnv: "RESERVED_NANDOBC0_CODE" },',
    '  { canonicalName: "NandoBC0", badge: "imperio_sohlar", codeEnv: "RESERVED_NANDOBC0_CODE" },\n  { canonicalName: "Shine", badge: "princesa_tess", codeEnv: "RESERVED_SHINE_CODE" },',
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
    '  if (normalized === "nandobc0") return { name: "NandoBC0", label: "Império Sohlar" };',
    '  if (normalized === "nandobc0") return { name: "NandoBC0", label: "Império Sohlar" };\n  if (normalized === "shine") return { name: "Shine", label: "Princesa Tess" };',
    "modal do nome",
  );

  write(path, src);
}

// Home e pré-entrada reconhecem Shine como nome reservado.
for (const path of ["components/home/home-client.tsx", "components/call/pre-join.tsx"]) {
  let src = read(path);
  const before = '["ohenrique", "userqubo", "nandobc0"]';
  const after = '["ohenrique", "userqubo", "nandobc0", "shine"]';
  if (!src.includes(before)) throw new Error("Shine: lista reservada ausente em " + path);
  src = src.replaceAll(before, after);
  write(path, src);
}

// Tile principal: tag rosa/lilás.
{
  const path = "components/call/participant-tile.tsx";
  let src = read(path);
  src = src.replaceAll('"creator" | "editor" | "imperio_sohlar"', '"creator" | "editor" | "imperio_sohlar" | "princesa_tess"');

  const marker = '{badge === "imperio_sohlar" && <span title="Império Sohlar"';
  const i = src.indexOf(marker);
  if (i < 0) throw new Error("Shine: tag Império Sohlar não encontrada no participant tile.");
  const end = src.indexOf('</span>}', i);
  if (end < 0) throw new Error("Shine: fim da tag Império Sohlar não encontrado.");
  const pos = end + '</span>}'.length;
  src = src.slice(0, pos) +
    '\n        {badge === "princesa_tess" && <span title="Princesa Tess" className="inline-flex shrink-0 items-center rounded-full border border-pink-300/30 bg-pink-400/[.14] px-2.5 py-1 text-[9px] font-bold tracking-[.06em] text-pink-100 shadow-[0_0_18px_rgba(244,114,182,.14)] backdrop-blur-md">PRINCESA TESS</span>}' +
    src.slice(pos);

  write(path, src);
}

// Painel de participantes.
{
  const path = "components/call/participants-panel.tsx";
  let src = read(path);
  src = src.replaceAll('"creator" | "editor" | "imperio_sohlar"', '"creator" | "editor" | "imperio_sohlar" | "princesa_tess"');

  const marker = '{meta(participant).badge === "imperio_sohlar" && <span title="Império Sohlar"';
  const i = src.indexOf(marker);
  if (i < 0) throw new Error("Shine: tag Império Sohlar não encontrada no painel.");
  const end = src.indexOf('</span>}', i);
  if (end < 0) throw new Error("Shine: fim da tag Império Sohlar não encontrado no painel.");
  const pos = end + '</span>}'.length;
  src = src.slice(0, pos) +
    '{meta(participant).badge === "princesa_tess" && <span title="Princesa Tess" className="inline-flex shrink-0 items-center rounded-md bg-pink-300/10 px-1.5 py-0.5 text-[8px] font-semibold text-pink-200">PRINCESA TESS</span>}' +
    src.slice(pos);

  write(path, src);
}

// Chat: nome e tag rosa.
{
  const path = "components/call/chat-panel.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    'type Badge = "creator" | "editor" | "imperio_sohlar";',
    'type Badge = "creator" | "editor" | "imperio_sohlar" | "princesa_tess";',
    "tipo da tag no chat",
  );

  src = mustReplace(
    src,
    '  if (badge === "imperio_sohlar") return "text-amber-300";\n  return "text-zinc-200";',
    '  if (badge === "imperio_sohlar") return "text-amber-300";\n  if (badge === "princesa_tess") return "text-pink-300";\n  return "text-zinc-200";',
    "cor no chat",
  );

  const block = `                      {badge === "imperio_sohlar" && (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-amber-300/25 bg-amber-400/[.12] px-2 py-0.5 text-[8px] font-bold tracking-[.06em] text-amber-100">
                          IMPÉRIO SOHLAR
                        </span>
                      )}`;

  const replacement = block + `

                      {badge === "princesa_tess" && (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-pink-300/25 bg-pink-400/[.12] px-2 py-0.5 text-[8px] font-bold tracking-[.06em] text-pink-100">
                          PRINCESA TESS
                        </span>
                      )}`;

  src = mustReplace(src, block, replacement, "tag no chat");
  write(path, src);
}

// Compartilhamento de tela.
{
  const path = "components/call/screen-share-view.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    'let badge: "creator" | "editor" | "imperio_sohlar" | undefined;',
    'let badge: "creator" | "editor" | "imperio_sohlar" | "princesa_tess" | undefined;',
    "tipo da tag na transmissão",
  );

  const block = `            {badge === "imperio_sohlar" && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-amber-300/30 bg-amber-400/[.14] px-2 py-1 text-[9px] font-bold tracking-[.06em] text-amber-100">
                IMPÉRIO SOHLAR
              </span>
            )}`;

  const replacement = block + `
            {badge === "princesa_tess" && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-pink-300/30 bg-pink-400/[.14] px-2 py-1 text-[9px] font-bold tracking-[.06em] text-pink-100">
                PRINCESA TESS
              </span>
            )}`;

  src = mustReplace(src, block, replacement, "tag na transmissão");
  write(path, src);
}
