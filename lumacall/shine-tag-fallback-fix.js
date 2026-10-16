const fs = require("fs");

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, source) { fs.writeFileSync(path, source); }
function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error("Shine fallback: trecho não encontrado - " + label);
  return source.replace(from, to);
}

// Tile principal: se o metadata ainda não atualizou, o nome reservado validado garante a tag.
{
  const path = "components/call/participant-tile.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    '  const badge = participantMeta(participant).badge;',
    '  const badge = participantMeta(participant).badge ?? (participant.name?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : undefined);',
    "badge do tile",
  );

  write(path, src);
}

// Painel de participantes.
{
  const path = "components/call/participants-panel.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    'function host(participant: Participant) { return meta(participant).role === "host"; }',
    'function host(participant: Participant) { return meta(participant).role === "host"; }\nfunction badgeFor(participant: Participant) { return meta(participant).badge ?? (participant.name?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : undefined); }',
    "helper do painel",
  );

  src = src.replaceAll('meta(participant).badge === "creator"', 'badgeFor(participant) === "creator"');
  src = src.replaceAll('meta(participant).badge === "editor"', 'badgeFor(participant) === "editor"');
  src = src.replaceAll('meta(participant).badge === "imperio_sohlar"', 'badgeFor(participant) === "imperio_sohlar"');
  src = src.replaceAll('meta(participant).badge === "princesa_tess"', 'badgeFor(participant) === "princesa_tess"');
  src = src.replaceAll('reservedAvatarForBadge(meta(participant).badge)', 'reservedAvatarForBadge(badgeFor(participant))');

  write(path, src);
}

// Chat: fallback pelo nome do remetente.
{
  const path = "components/call/chat-panel.tsx";
  let src = read(path);

  src = mustReplace(
    src,
    'function badgeOf(metadata?: string): Badge | undefined {',
    'function badgeOf(metadata?: string, participantName?: string): Badge | undefined {',
    "assinatura badgeOf",
  );

  src = mustReplace(
    src,
    '  if (!metadata) return undefined;',
    '  if (!metadata) return participantName?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : undefined;',
    "fallback sem metadata",
  );

  src = mustReplace(
    src,
    '    return value.badge;',
    '    return value.badge ?? (participantName?.toLocaleLowerCase("pt-BR") === "shine" ? "princesa_tess" : undefined);',
    "fallback no metadata",
  );

  src = mustReplace(
    src,
    '              const badge = badgeOf(item.from?.metadata);\n              const avatar = reservedAvatarForBadge(badge);\n              const name = item.from?.name || "Participante";',
    '              const name = item.from?.name || "Participante";\n              const badge = badgeOf(item.from?.metadata, name);\n              const avatar = reservedAvatarForBadge(badge);',
    "uso do fallback no chat",
  );

  write(path, src);
}

// Compartilhamento de tela.
{
  const path = "components/call/screen-share-view.tsx";
  let src = read(path);

  const anchor = '  } catch {}\n\n  useEffect(() => {';
  if (!src.includes(anchor)) throw new Error("Shine fallback: metadata da transmissão não encontrado.");
  src = src.replace(
    anchor,
    '  } catch {}\n  if (!badge && participant.name?.toLocaleLowerCase("pt-BR") === "shine") badge = "princesa_tess";\n\n  useEffect(() => {',
  );

  write(path, src);
}
