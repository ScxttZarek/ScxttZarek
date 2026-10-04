const fs = require("fs");

function replace(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) throw new Error("Trecho visual não encontrado em " + path);
  fs.writeFileSync(path, source.replace(from, to));
}

replace("components/home/home-client.tsx",
  '<main className="relative min-h-screen overflow-hidden px-6">',
  '<main className="lumacall-home relative min-h-screen overflow-hidden px-6">'
);

replace("components/home/home-client.tsx",
  '<div className="glass rounded-[28px] p-2">',
  '<div className="glass lumacall-home-card rounded-[30px] p-2">'
);

replace("components/home/home-client.tsx",
  'className="focus-ring group flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"',
  'className="home-create-btn focus-ring group flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left text-sm font-semibold text-zinc-950 transition"'
);

const path = "app/globals.css";
let css = fs.readFileSync(path, "utf8");
if (!css.includes("/* LunaCall visual polish */")) {
  css += `

/* LunaCall visual polish */
html { background: #050609; }

body {
  background:
    radial-gradient(circle at 16% 0%, rgba(139, 92, 246, .10), transparent 30%),
    radial-gradient(circle at 88% 92%, rgba(34, 211, 238, .04), transparent 25%),
    #050609;
}

::selection {
  background: rgba(196, 181, 253, .24);
  color: #fff;
}

.lumacall-home::before {
  content: "";
  position: absolute;
  width: 34rem;
  height: 34rem;
  left: -13rem;
  top: -16rem;
  border-radius: 9999px;
  background: rgba(139, 92, 246, .07);
  filter: blur(80px);
  pointer-events: none;
}

.lumacall-home-card {
  background: linear-gradient(145deg, rgba(18, 19, 25, .90), rgba(8, 9, 13, .82));
  border-color: rgba(255, 255, 255, .08);
  box-shadow: 0 26px 80px rgba(0, 0, 0, .38);
}

.home-create-btn {
  background: linear-gradient(135deg, #fff 0%, #eeeafc 60%, #e5e7eb 100%);
  box-shadow: 0 10px 30px rgba(124, 58, 237, .10);
}

.home-create-btn:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, #fff 0%, #f4f1ff 100%);
}

.lumacall-call-stage {
  background: radial-gradient(circle at 50% 15%, rgba(139, 92, 246, .04), transparent 34%);
}

.screen-share-frame,
.lumacall-chat-panel {
  box-shadow: 0 20px 55px rgba(0, 0, 0, .30);
}
`;
}
fs.writeFileSync(path, css);
