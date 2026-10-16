const fs = require("fs");

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, source) { fs.writeFileSync(path, source); }
fs.mkdirSync("public/avatars", { recursive: true });
fs.writeFileSync("public/avatars/aldron.webp", Buffer.from("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", "base64"));

function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error("Aldron avatar fallback: trecho não encontrado - " + label);
  return source.replace(from, to);
}

// A função de avatar também aceita o nome como fallback seguro.
{
  const path = "lib/reserved-profile.ts";
  let src = read(path);

  src = mustReplace(
    src,
    'export function reservedAvatarForBadge(badge?: string) {\n  return badge === "creator" || badge === "editor" || badge === "imperio_sohlar" || badge === "bolacha_oreo" ? AVATARS[badge] : null;\n}',
    'export function reservedAvatarForBadge(badge?: string, participantName?: string) {\n  if (badge === "bolacha_oreo" || participantName?.toLocaleLowerCase("pt-BR") === "aldron") return "/avatars/aldron.webp";\n  if (badge === "creator" || badge === "editor" || badge === "imperio_sohlar") return AVATARS[badge];\n  return null;\n}',
    "resolver do avatar",
  );

  write(path, src);
}

// Tile principal.
{
  const path = "components/call/participant-tile.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    '  const reservedAvatar = reservedAvatarForBadge(badge);',
    '  const reservedAvatar = reservedAvatarForBadge(badge, participant.name);',
    "avatar do tile",
  );

  write(path, src);
}

// Painel de participantes.
{
  const path = "components/call/participants-panel.tsx";
  let src = read(path);

  src = src.replaceAll(
    'reservedAvatarForBadge(badgeFor(participant))',
    'reservedAvatarForBadge(badgeFor(participant), participant.name)',
  );

  write(path, src);
}

// Chat.
{
  const path = "components/call/chat-panel.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    '              const avatar = reservedAvatarForBadge(badge);',
    '              const avatar = reservedAvatarForBadge(badge, name);',
    "avatar do chat",
  );

  write(path, src);
}


require("./aldron-direct-avatar-fix.js");
