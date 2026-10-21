const fs = require("fs");

// Mantém o vídeo da tela compartilhada anexado ao elemento enquanto a track é a mesma.
// As atualizações de revision da sala não devem provocar detach/attach desnecessários.
const path = "components/call/screen-share-view.tsx";
const source = fs.readFileSync(path, "utf8");
const from = "  useEffect(() => {\n    const element = videoRef.current;\n    if (!element || !track) return;\n    track.attach(element);\n    return () => { track.detach(element); };\n  }, [track, revision]);";
const to = "  useEffect(() => {\n    const element = videoRef.current;\n    if (!element || !track) return;\n    track.attach(element);\n    return () => { track.detach(element); };\n  }, [track]);";

if (source.split(from).length !== 2) {
  throw new Error("Screen share stability: âncora de track attach não encontrada ou duplicada");
}

fs.writeFileSync(path, source.replace(from, to));
