const fs = require("fs");

function mustReplace(source, from, to, label) {
  if (!source.includes(from)) throw new Error("Não foi possível aplicar ajuste mobile: " + label);
  return source.replace(from, to);
}

// Remove os atalhos M/V que já haviam sido recusados e adiciona hook no painel de participantes.
{
  const path = "components/call/call-room.tsx";
  let src = fs.readFileSync(path, "utf8");

  const shortcuts = `  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select") || target?.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() === "m") { event.preventDefault(); toggleMic(); }
      if (event.key.toLowerCase() === "v") { event.preventDefault(); toggleCamera(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

`;
  if (src.includes(shortcuts)) src = src.replace(shortcuts, "");

  fs.writeFileSync(path, src);
}

{
  const path = "components/call/participants-panel.tsx";
  let src = fs.readFileSync(path, "utf8");
  src = mustReplace(
    src,
    'return <aside className={`absolute inset-y-0 right-0 z-40 flex w-full flex-col sm:w-[330px]',
    'return <aside className={`lumacall-participants-panel absolute inset-y-0 right-0 z-40 flex w-full flex-col sm:w-[330px]',
    "classe do painel de participantes",
  );
  fs.writeFileSync(path, src);
}

// Evita estouro no cabeçalho da home em Androids pequenos.
{
  const path = "components/home/home-client.tsx";
  let src = fs.readFileSync(path, "utf8");

  src = mustReplace(
    src,
    '<div className="flex items-center gap-3 text-sm text-zinc-400">\n            <InstallAppButton />',
    '<div className="home-header-actions flex items-center gap-3 text-sm text-zinc-400">\n            <InstallAppButton />',
    "ações do cabeçalho da home",
  );

  src = mustReplace(
    src,
    'className="focus-ring inline-flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-2 transition hover:bg-white/[.055]" aria-label="Alterar nome"',
    'className="home-profile-button focus-ring inline-flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-2 transition hover:bg-white/[.055]" aria-label="Alterar nome"',
    "botão do perfil na home",
  );

  src = mustReplace(
    src,
    '<span className="max-w-40 truncate">{displayName}</span>',
    '<span className="home-profile-name max-w-40 truncate">{displayName}</span>',
    "nome do perfil na home",
  );

  fs.writeFileSync(path, src);
}

// Protege o código da sala em prejoin contra telas estreitas.
{
  const path = "components/call/pre-join.tsx";
  let src = fs.readFileSync(path, "utf8");
  src = mustReplace(
    src,
    '<div className="rounded-full border border-white/[.07] bg-white/[.025] px-3 py-1.5 font-mono text-xs tracking-[.14em] text-zinc-400">SALA {roomId}</div>',
    '<div className="prejoin-room-code rounded-full border border-white/[.07] bg-white/[.025] px-3 py-1.5 font-mono text-xs tracking-[.14em] text-zinc-400">SALA {roomId}</div>',
    "código da sala no prejoin",
  );
  fs.writeFileSync(path, src);
}

// Ajustes finais de interface mobile.
{
  const path = "app/globals.css";
  let css = fs.readFileSync(path, "utf8");

  if (!css.includes("/* LunaCall launch mobile audit */")) {
    css += `

/* LunaCall launch mobile audit */
@media (max-width: 860px) {
  .lumacall-participants-panel {
    bottom: calc(66px + env(safe-area-inset-bottom)) !important;
  }

  .prejoin-room-code {
    max-width: 54vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 560px) {
  .lumacall-participants-panel {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}

@media (max-width: 430px) {
  .home-header-actions {
    gap: 4px !important;
    min-width: 0;
  }

  .home-profile-button {
    width: 36px;
    height: 36px;
    padding: 0 !important;
    justify-content: center;
    flex: 0 0 auto;
  }

  .home-profile-name {
    display: none;
  }

  .prejoin-room-code {
    max-width: 50vw;
    padding-left: 9px;
    padding-right: 9px;
    font-size: 10px;
    letter-spacing: .08em;
  }
}

@media (max-width: 340px) {
  .home-header-actions {
    gap: 2px !important;
  }

  .home-profile-button {
    width: 34px;
    height: 34px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .speaking {
    animation: none !important;
  }
}
`;
  }

  fs.writeFileSync(path, css);
}
