const fs = require("fs");
for (const path of ["app/layout.tsx","components/home/home-client.tsx","app/privacidade/page.tsx","app/termos/page.tsx"]) {
  if (!fs.existsSync(path)) continue;
  const src = fs.readFileSync(path, "utf8");
  if (path.includes("home-client")) {
    const i = src.indexOf("Sem anúncios");
    console.log("ADSENSE_INSPECT " + path + "=" + JSON.stringify(i >= 0 ? src.slice(Math.max(0,i-900), i+1200) : src.slice(0,3000)));
  } else {
    console.log("ADSENSE_INSPECT " + path + "=" + JSON.stringify(src.slice(0,12000)));
  }
}
