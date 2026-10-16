const fs = require("fs");

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, source) { fs.writeFileSync(path, source); }
function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error("Aldron direct avatar: trecho não encontrado - " + label);
  return source.replace(from, to);
}

{
  const path = "components/call/participant-tile.tsx";
  let src = read(path);
  src = mustReplace(
    src,
    '  const reservedAvatar = reservedAvatarForBadge(badge, participant.name);',
    '  const reservedAvatar = badge === "bolacha_oreo" || participant.name?.toLocaleLowerCase("pt-BR") === "aldron" ? "/avatars/aldron.webp" : reservedAvatarForBadge(badge, participant.name);',
    "tile"
  );
  write(path, src);
}

{
  const path = "components/call/participants-panel.tsx";
  let src = read(path);
  src = src.replaceAll(
    'reservedAvatarForBadge(badgeFor(participant), participant.name)',
    '(badgeFor(participant) === "bolacha_oreo" || participant.name?.toLocaleLowerCase("pt-BR") === "aldron" ? "/avatars/aldron.webp" : reservedAvatarForBadge(badgeFor(participant), participant.name))'
  );
  write(path, src);
}

{
  const path = "components/call/chat-panel.tsx";
  let src = read(path);
  src = mustReplace(
    src,
    '              const avatar = reservedAvatarForBadge(badge, name);',
    '              const avatar = badge === "bolacha_oreo" || name.toLocaleLowerCase("pt-BR") === "aldron" ? "/avatars/aldron.webp" : reservedAvatarForBadge(badge, name);',
    "chat"
  );
  write(path, src);
}


require("./shine-avatar-fix.js");
