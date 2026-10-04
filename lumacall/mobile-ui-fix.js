const fs = require("fs");

function replace(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) {
    throw new Error("Trecho mobile não encontrado em " + path + ": " + from.slice(0, 100));
  }
  fs.writeFileSync(path, source.replace(from, to));
}

/* Home */
replace(
  "components/home/home-client.tsx",
  '["Sem cadastro", "Sem anúncios", "Compartilhamento em até 1080p", "Feito para PC"]',
  '["Sem cadastro", "Sem anúncios", "PC e celular", "Tela em até 1080p no PC"]'
);
replace(
  "components/home/home-client.tsx",
  '<main className="lumacall-home relative min-h-screen overflow-hidden px-6">',
  '<main className="lumacall-home relative min-h-dvh overflow-x-hidden px-4 sm:px-6">'
);

replace(
  "components/home/home-client.tsx",
  '<header className="flex h-20 items-center justify-between">',
  '<header className="flex h-16 items-center justify-between sm:h-20">'
);

replace(
  "components/home/home-client.tsx",
  '<section className="flex flex-1 items-center py-10">',
  '<section className="flex flex-1 items-center py-6 sm:py-10">'
);

replace(
  "components/home/home-client.tsx",
  '<div className="grid w-full grid-cols-[1.05fr_.95fr] items-center gap-14">',
  '<div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">'
);

replace(
  "components/home/home-client.tsx",
  '<h1 className="max-w-2xl text-[54px] font-semibold leading-[1.03] tracking-[-.055em] text-white">',
  '<h1 className="max-w-2xl text-[38px] font-semibold leading-[1.04] tracking-[-.05em] text-white sm:text-[46px] lg:text-[54px]">'
);

replace(
  "components/home/home-client.tsx",
  '<p className="mt-6 max-w-xl text-[17px] leading-7 text-zinc-400">',
  '<p className="mt-4 max-w-xl text-[15px] leading-6 text-zinc-400 sm:mt-6 sm:text-[17px] sm:leading-7">'
);

replace(
  "components/home/home-client.tsx",
  '<div className="rounded-[22px] border border-white/[.055] bg-black/20 p-7">',
  '<div className="rounded-[22px] border border-white/[.055] bg-black/20 p-5 sm:p-7">'
);

/* Pre-join */
replace(
  "components/call/pre-join.tsx",
  '<main className="min-h-screen px-6">',
  '<main className="min-h-dvh px-4 sm:px-6">'
);

replace(
  "components/call/pre-join.tsx",
  '<div className="mx-auto flex min-h-screen max-w-6xl flex-col">',
  '<div className="mx-auto flex min-h-dvh max-w-6xl flex-col">'
);

replace(
  "components/call/pre-join.tsx",
  '<header className="flex h-20 items-center justify-between">',
  '<header className="flex h-16 items-center justify-between gap-3 sm:h-20">'
);

replace(
  "components/call/pre-join.tsx",
  '<div className="flex flex-1 items-center py-8">',
  '<div className="flex flex-1 items-start py-4 sm:items-center sm:py-8">'
);

replace(
  "components/call/pre-join.tsx",
  '<form onSubmit={submit} className="grid w-full grid-cols-[1.1fr_.9fr] gap-7">',
  '<form onSubmit={submit} className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[1.1fr_.9fr] lg:gap-7">'
);

replace(
  "components/call/pre-join.tsx",
  '<section className="glass rounded-[28px] p-7">',
  '<section className="glass rounded-[28px] p-5 sm:p-7">'
);

/* Room shell */
replace(
  "components/call/room-client.tsx",
  'className="desktop-shell h-screen overflow-hidden"',
  'className="desktop-shell h-dvh overflow-hidden"'
);

replace(
  "components/call/room-client.tsx",
  'className="desktop-shell grid min-h-screen place-items-center px-6"',
  'className="desktop-shell grid min-h-dvh place-items-center px-4 sm:px-6"'
);

/* Call */
replace(
  "components/call/call-room.tsx",
  '<div className="flex h-full flex-col bg-[#08090b]">',
  '<div className="mobile-call flex h-full flex-col bg-[#08090b]">'
);

replace(
  "components/call/call-room.tsx",
  '<header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[.06] bg-[#0a0b0d]/92 px-4 backdrop-blur-xl">',
  '<header className="call-header flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/[.06] bg-[#0a0b0d]/92 px-3 backdrop-blur-xl sm:px-4">'
);

replace(
  "components/call/call-room.tsx",
  '<div className="flex items-center gap-4"><Brand />',
  '<div className="flex min-w-0 items-center gap-2 sm:gap-4"><Brand />'
);

replace(
  "components/call/call-room.tsx",
  '<main className={cn("lumacall-call-stage h-full p-3 transition-[padding] duration-200", panelOpen ? "pr-[362px]" : "pr-3")}>',
  '<main className={cn("lumacall-call-stage h-full p-2 transition-[padding] duration-200 sm:p-3", panelOpen ? "sm:pr-[362px]" : "sm:pr-3")}>'
);

replace(
  "components/call/call-room.tsx",
  '<div className="mx-auto grid min-h-full w-full max-w-6xl content-center gap-3 py-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>',
  '<div className="participant-grid mx-auto grid min-h-full w-full max-w-6xl content-center gap-2 py-1 sm:gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>'
);

/* Side panels become mobile sheets */
replace(
  "components/call/chat-panel.tsx",
  '"lumacall-chat-panel absolute bottom-3 right-3 top-3 z-30 flex w-[344px] flex-col overflow-hidden rounded-[22px] border border-white/[.08] bg-[#0b0c10]/95 shadow-2xl shadow-black/35 backdrop-blur-xl transition duration-200",',
  '"lumacall-chat-panel absolute inset-x-2 bottom-2 top-14 z-40 flex w-auto flex-col overflow-hidden rounded-[22px] border border-white/[.08] bg-[#0b0c10]/95 shadow-2xl shadow-black/35 backdrop-blur-xl transition duration-200 sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:w-[344px]",'
);

replace(
  "components/call/participants-panel.tsx",
  'absolute inset-y-0 right-0 z-30 flex w-[330px] flex-col',
  'absolute inset-y-0 right-0 z-40 flex w-full flex-col sm:w-[330px]'
);

/* CSS */
const cssPath = "app/globals.css";
let css = fs.readFileSync(cssPath, "utf8");

if (!css.includes("/* LunaCall mobile v1 */")) {
  css += `

/* LunaCall mobile v1 */
@media (max-width: 860px) {
  .mobile-gate {
    display: none !important;
  }

  .desktop-shell {
    display: block !important;
    width: 100%;
    min-height: 100dvh;
  }

  .participant-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    align-content: start;
  }

  .call-header {
    overflow: hidden;
  }

  .call-header > div:first-child {
    min-width: 0;
  }

  .call-header > div:last-child {
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .call-header > div:last-child::-webkit-scrollbar,
  .control-bar-inner::-webkit-scrollbar {
    display: none;
  }

  .control-bar {
    padding-bottom: max(0px, env(safe-area-inset-bottom));
  }

  .control-bar-inner {
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .lumacall-chat-panel {
    max-width: calc(100vw - 1rem);
  }
}

@media (max-width: 560px) {
  .participant-grid {
    grid-template-columns: minmax(0, 1fr) !important;
    align-content: start;
  }

  .call-header {
    height: 56px;
  }

  .call-header > div:first-child {
    gap: 7px;
  }

  .call-header > div:first-child > span {
    display: none;
  }

  .call-header > div:first-child p {
    display: none;
  }

  .call-header > div:last-child {
    gap: 4px;
  }

  .call-header > div:last-child button {
    width: 36px;
    height: 36px;
    padding: 0;
    justify-content: center;
    font-size: 0;
    flex: 0 0 auto;
  }

  .control-bar {
    height: calc(66px + env(safe-area-inset-bottom));
    padding-left: 8px;
    padding-right: 8px;
  }

  .control-bar-inner {
    width: 100%;
    justify-content: space-between;
    gap: 4px;
  }

  .control-bar button {
    width: 40px;
    height: 40px;
    border-radius: 11px;
  }

  .control-divider {
    display: none;
  }

  .screen-share-frame > div:first-child {
    min-height: 48px;
    height: auto;
    padding-left: 8px;
    padding-right: 8px;
    gap: 6px;
  }

  .screen-share-frame input[type="range"] {
    width: 44px;
  }

  .screen-share-frame input[type="range"] + span {
    display: none;
  }

  .lumacall-home .soft-grid {
    opacity: .3;
  }

  .lumacall-home-card {
    border-radius: 24px;
  }
}

@media (max-width: 380px) {
  .control-bar button {
    width: 37px;
    height: 37px;
  }

  .control-bar-inner {
    gap: 2px;
  }
}
`;
}

fs.writeFileSync(cssPath, css);
