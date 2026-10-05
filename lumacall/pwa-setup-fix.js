const fs = require("fs");
const zlib = require("zlib");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function makeIcon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const pad = Math.round(size * 0.12);
  const radius = Math.round(size * 0.19);
  const border = Math.max(2, Math.round(size * 0.018));
  const left = Math.round(size * 0.39);
  const top = Math.round(size * 0.30);
  const stemW = Math.round(size * 0.10);
  const stemH = Math.round(size * 0.40);
  const footW = Math.round(size * 0.28);
  const footH = Math.round(size * 0.10);

  function insideRounded(x, y, inset) {
    const x0 = pad + inset, y0 = pad + inset, x1 = size - pad - inset - 1, y1 = size - pad - inset - 1;
    const r = Math.max(0, radius - inset);
    if (x < x0 || x > x1 || y < y0 || y > y1) return false;
    const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
    const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
    return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
  }

  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      let rgba = [8, 9, 11, 255];
      const outer = insideRounded(x, y, 0);
      const inner = insideRounded(x, y, border);
      if (outer) rgba = inner ? [21, 18, 31, 255] : [139, 92, 246, 255];

      const inStem = x >= left && x < left + stemW && y >= top && y < top + stemH;
      const inFoot = x >= left && x < left + footW && y >= top + stemH - footH && y < top + stemH;
      if (inStem || inFoot) rgba = [238, 233, 255, 255];

      const p = row + 1 + x * 4;
      raw[p] = rgba[0]; raw[p + 1] = rgba[1]; raw[p + 2] = rgba[2]; raw[p + 3] = rgba[3];
    }
  }

  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync("public/icons", { recursive: true });
fs.writeFileSync("public/icons/lumacall-192.png", makeIcon(192));
fs.writeFileSync("public/icons/lumacall-512.png", makeIcon(512));

fs.writeFileSync("public/offline.html", `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#08090b">
  <title>LumaCall — sem conexão</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#08090b;color:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px}
    main{width:min(420px,100%);border:1px solid rgba(255,255,255,.08);background:#0d0e11;border-radius:24px;padding:32px;text-align:center}
    h1{font-size:22px;margin:0 0 10px}p{font-size:14px;line-height:1.6;color:#a1a1aa;margin:0}
    button{margin-top:22px;border:1px solid rgba(255,255,255,.1);background:#fff;color:#09090b;border-radius:12px;padding:11px 16px;font-weight:700;cursor:pointer}
  </style>
</head>
<body><main><h1>Sem conexão com a internet.</h1><p>O LumaCall precisa de conexão para chamadas. Assim que sua internet voltar, tente novamente.</p><button onclick="location.reload()">Tentar novamente</button></main></body>
</html>`);

fs.writeFileSync("public/sw.js", `const CACHE = "lumacall-shell-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/offline.html")));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
});`);

{
  const path = "components/home/home-client.tsx";
  let src = fs.readFileSync(path, "utf8");
  const importAnchor = 'import { Brand } from "@/components/ui/brand";';
  if (!src.includes(importAnchor)) throw new Error("Import da home não encontrado para PWA.");
  src = src.replace(importAnchor, importAnchor + '\nimport { InstallAppButton } from "@/components/ui/install-app-button";');

  const headerAnchor = '<div className="flex items-center gap-3 text-sm text-zinc-400">\n            {displayName && (';
  if (!src.includes(headerAnchor)) throw new Error("Cabeçalho da home não encontrado para PWA.");
  src = src.replace(
    headerAnchor,
    '<div className="flex items-center gap-3 text-sm text-zinc-400">\n            <InstallAppButton />\n            {displayName && (',
  );
  fs.writeFileSync(path, src);
}

{
  const path = "app/layout.tsx";
  let src = fs.readFileSync(path, "utf8");
  const metaAnchor = '  description: "Chamadas de voz, vídeo, chat e compartilhamento de tela diretamente pelo navegador.",';
  if (!src.includes(metaAnchor)) throw new Error("Metadata do layout não encontrada para PWA.");
  src = src.replace(
    metaAnchor,
    metaAnchor + '\n  applicationName: APP_NAME,\n  manifest: "/manifest.webmanifest",\n  icons: {\n    icon: "/icons/lumacall-192.png",\n    apple: "/icons/lumacall-192.png",\n  },',
  );
  fs.writeFileSync(path, src);
}
