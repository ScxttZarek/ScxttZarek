import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LumaCall",
    short_name: "LumaCall",
    description: "Chamadas de voz, vídeo, chat e compartilhamento de tela diretamente pelo navegador.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#08090b",
    theme_color: "#08090b",
    lang: "pt-BR",
    orientation: "any",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/lumacall-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/lumacall-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
