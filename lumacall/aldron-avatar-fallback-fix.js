const fs = require("fs");

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, source) { fs.writeFileSync(path, source); }
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
    'export function reservedAvatarForBadge(badge?: string, participantName?: string) {\n  if (badge === "creator" || badge === "editor" || badge === "imperio_sohlar" || badge === "bolacha_oreo") return AVATARS[badge];\n  if (participantName?.toLocaleLowerCase("pt-BR") === "aldron") return AVATARS.bolacha_oreo;\n  return null;\n}',
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
