const fs = require("fs");

const path = "components/call/pre-join.tsx";
let source = fs.readFileSync(path, "utf8");

if (!source.includes('import { unlockJoinSound } from "@/lib/join-sound";')) {
  const firstImportEnd = source.indexOf("\n", source.indexOf("import "));
  source =
    source.slice(0, firstImportEnd + 1) +
    'import { unlockJoinSound } from "@/lib/join-sound";\n' +
    source.slice(firstImportEnd + 1);
}

const needle = "  function submit(event: FormEvent) {";
if (source.includes(needle) && !source.includes("void unlockJoinSound();")) {
  source = source.replace(
    needle,
    needle + '\n    void unlockJoinSound();'
  );
}

fs.writeFileSync(path, source);
