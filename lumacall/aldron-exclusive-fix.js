const fs = require("fs");

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, source) { fs.writeFileSync(path, source); }
function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error("Aldron: trecho não encontrado - " + label);
  return source.replace(from, to);
}

// Backend seguro do nome reservado.
{
  const path = "lib/reserved-name-server.ts";
  let src = read(path);

  src = mustReplace(
    src,
    'export type ReservedBadge = "creator" | "editor" | "imperio_sohlar" | "princesa_tess";',
    'export type ReservedBadge = "creator" | "editor" | "imperio_sohlar" | "princesa_tess" | "bolacha_oreo";',
    "tipo da tag",
  );

  src = mustReplace(
    src,
    '  canonicalName: "OHenrique" | "UserQubo" | "NandoBC0" | "Shine";',
    '  canonicalName: "OHenrique" | "UserQubo" | "NandoBC0" | "Shine" | "Aldron";',
    "nomes reservados",
  );

  src = mustReplace(
    src,
    '  codeEnv: "RESERVED_OHENRIQUE_CODE" | "RESERVED_USERQUBO_CODE" | "RESERVED_NANDOBC0_CODE" | "RESERVED_SHINE_CODE";',
    '  codeEnv: "RESERVED_OHENRIQUE_CODE" | "RESERVED_USERQUBO_CODE" | "RESERVED_NANDOBC0_CODE" | "RESERVED_SHINE_CODE" | "RESERVED_ALDRON_CODE";',
    "env reservada",
  );

  src = mustReplace(
    src,
    '  { canonicalName: "Shine", badge: "princesa_tess", codeEnv: "RESERVED_SHINE_CODE" },',
    '  { canonicalName: "Shine", badge: "princesa_tess", codeEnv: "RESERVED_SHINE_CODE" },\n  { canonicalName: "Aldron", badge: "bolacha_oreo", codeEnv: "RESERVED_ALDRON_CODE" },',
    "registro reservado",
  );

  write(path, src);
}

// Modal.
{
  const path = "components/ui/name-modal.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    '  if (normalized === "shine") return { name: "Shine", label: "Princesa Tess" };',
    '  if (normalized === "shine") return { name: "Shine", label: "Princesa Tess" };\n  if (normalized === "aldron") return { name: "Aldron", label: "BolachaOreo" };',
    "modal do nome",
  );

  write(path, src);
}

// Home e prejoin.
for (const path of ["components/home/home-client.tsx", "components/call/pre-join.tsx"]) {
  let src = read(path);
  const before = '["ohenrique", "userqubo", "nandobc0", "shine"]';
  const after = '["ohenrique", "userqubo", "nandobc0", "shine", "aldron"]';
  if (!src.includes(before)) throw new Error("Aldron: lista reservada ausente em " + path);
  src = src.replaceAll(before, after);
  write(path, src);
}

// Tile principal: badge + fallback imediato pelo nome reservado.
{
  const path = "components/call/participant-tile.tsx";
  let src = read(path);

  src = src.replaceAll(
    '"creator" | "editor" | "imperio_sohlar" | "princesa_tess"',
    '"creator" | "editor" | "imperio_sohlar" | "princesa_tess" | "bolacha_oreo"',
  );

  src = mustReplace(
    src,
    '  const badge = participantMeta(participant).badge ?? (participant.name?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : undefined);',
    '  const badge = participantMeta(participant).badge ?? (participant.name?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : participant.name?.toLocaleLowerCase("pt-BR") === "aldron" ? "bolacha_oreo" : undefined);',
    "fallback do tile",
  );

  const marker = '{badge === "princesa_tess" && <span title="Princesa Tess"';
  const i = src.indexOf(marker);
  if (i < 0) throw new Error("Aldron: tag Princesa Tess não encontrada no tile.");
  const end = src.indexOf('</span>}', i);
  if (end < 0) throw new Error("Aldron: fim da tag Princesa Tess não encontrado no tile.");
  const pos = end + '</span>}'.length;

  src = src.slice(0, pos) +
    '\n        {badge === "bolacha_oreo" && <span title="BolachaOreo" className="inline-flex shrink-0 items-center rounded-full border border-zinc-200/25 bg-zinc-100/[.10] px-2.5 py-1 text-[9px] font-bold tracking-[.06em] text-zinc-100 shadow-[0_0_18px_rgba(255,255,255,.08)] backdrop-blur-md">BOLACHAOREO</span>}' +
    src.slice(pos);

  write(path, src);
}

// Painel de participantes.
{
  const path = "components/call/participants-panel.tsx";
  let src = read(path);

  src = src.replaceAll(
    '"creator" | "editor" | "imperio_sohlar" | "princesa_tess"',
    '"creator" | "editor" | "imperio_sohlar" | "princesa_tess" | "bolacha_oreo"',
  );

  src = mustReplace(
    src,
    'function badgeFor(participant: Participant) { return meta(participant).badge ?? (participant.name?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : undefined); }',
    'function badgeFor(participant: Participant) { return meta(participant).badge ?? (participant.name?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : participant.name?.toLocaleLowerCase("pt-BR") === "aldron" ? "bolacha_oreo" : undefined); }',
    "fallback do painel",
  );

  const marker = '{badgeFor(participant) === "princesa_tess" && <span title="Princesa Tess"';
  const i = src.indexOf(marker);
  if (i < 0) throw new Error("Aldron: tag Princesa Tess não encontrada no painel.");
  const end = src.indexOf('</span>}', i);
  if (end < 0) throw new Error("Aldron: fim da tag Princesa Tess não encontrado no painel.");
  const pos = end + '</span>}'.length;

  src = src.slice(0, pos) +
    '{badgeFor(participant) === "bolacha_oreo" && <span title="BolachaOreo" className="inline-flex shrink-0 items-center rounded-md border border-zinc-200/15 bg-zinc-100/10 px-1.5 py-0.5 text-[8px] font-semibold text-zinc-100">BOLACHAOREO</span>}' +
    src.slice(pos);

  write(path, src);
}

// Chat.
{
  const path = "components/call/chat-panel.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    'type Badge = "creator" | "editor" | "imperio_sohlar" | "princesa_tess";',
    'type Badge = "creator" | "editor" | "imperio_sohlar" | "princesa_tess" | "bolacha_oreo";',
    "tipo da tag no chat",
  );

  src = mustReplace(
    src,
    '  if (!metadata) return participantName?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : undefined;',
    '  if (!metadata) return participantName?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : participantName?.toLocaleLowerCase("pt-BR") === "aldron" ? "bolacha_oreo" : undefined;',
    "fallback sem metadata no chat",
  );

  src = mustReplace(
    src,
    '    return value.badge ?? (participantName?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : undefined);',
    '    return value.badge ?? (participantName?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : participantName?.toLocaleLowerCase("pt-BR") === "aldron" ? "bolacha_oreo" : undefined);',
    "fallback no metadata do chat",
  );

  src = mustReplace(
    src,
    '  if (badge === "princesa_tess") return "text-pink-300";\n  return "text-zinc-200";',
    '  if (badge === "princesa_tess") return "text-pink-300";\n  if (badge === "bolacha_oreo") return "text-zinc-100";\n  return "text-zinc-200";',
    "cor no chat",
  );

  const block = `                      {badge === "princesa_tess" && (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-pink-300/25 bg-pink-400/[.12] px-2 py-0.5 text-[8px] font-bold tracking-[.06em] text-pink-100">
                          PRINCESA TESS
                        </span>
                      )}`;

  const replacement = block + `

                      {badge === "bolacha_oreo" && (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-200/20 bg-zinc-100/[.10] px-2 py-0.5 text-[8px] font-bold tracking-[.06em] text-zinc-100">
                          BOLACHAOREO
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
    'let badge: "creator" | "editor" | "imperio_sohlar" | "princesa_tess" | undefined;',
    'let badge: "creator" | "editor" | "imperio_sohlar" | "princesa_tess" | "bolacha_oreo" | undefined;',
    "tipo da tag na transmissão",
  );

  src = mustReplace(
    src,
    '  if (!badge && participant.name?.toLocaleLowerCase("pt-BR") === "shine") badge = "princesa_tess";',
    '  if (!badge && participant.name?.toLocaleLowerCase("pt-BR") === "shine") badge = "princesa_tess";\n  if (!badge && participant.name?.toLocaleLowerCase("pt-BR") === "aldron") badge = "bolacha_oreo";',
    "fallback na transmissão",
  );

  const block = `            {badge === "princesa_tess" && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-pink-300/30 bg-pink-400/[.14] px-2 py-1 text-[9px] font-bold tracking-[.06em] text-pink-100">
                PRINCESA TESS
              </span>
            )}`;

  const replacement = block + `
            {badge === "bolacha_oreo" && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-200/25 bg-zinc-100/[.10] px-2 py-1 text-[9px] font-bold tracking-[.06em] text-zinc-100">
                BOLACHAOREO
              </span>
            )}`;

  src = mustReplace(src, block, replacement, "tag na transmissão");
  write(path, src);
}
