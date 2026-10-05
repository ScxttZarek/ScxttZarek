const fs = require("fs");

function replace(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) {
    throw new Error("Trecho de qualidade não encontrado em " + path + ": " + from.slice(0, 120));
  }
  fs.writeFileSync(path, source.replace(from, to));
}

replace(
  "types/call.ts",
  'export type ShareQuality = "auto" | "high" | "balanced";',
  'export type ShareQuality = "auto" | "1080p30" | "1080p15" | "720p30" | "720p15" | "480p30" | "480p15";'
);

replace(
  "components/call/call-room.tsx",
  '    const storedQuality = localStorage.getItem("lumacall.shareQuality") as ShareQuality | null;\n    if (storedQuality === "auto" || storedQuality === "high" || storedQuality === "balanced") setShareQuality(storedQuality);',
  `    const storedQuality = localStorage.getItem("lumacall.shareQuality");
    const validQualities: ShareQuality[] = ["auto", "1080p30", "1080p15", "720p30", "720p15", "480p30", "480p15"];
    if (storedQuality === "high") setShareQuality("1080p30");
    else if (storedQuality === "balanced") setShareQuality("1080p15");
    else if (validQualities.includes(storedQuality as ShareQuality)) setShareQuality(storedQuality as ShareQuality);`
);

replace(
  "components/call/call-room.tsx",
  `    const fps = shareQuality === "balanced" ? 15 : 30;
    const publishOptions = shareQuality === "auto" ? undefined : {
      screenShareEncoding: { maxBitrate: shareQuality === "high" ? 5_000_000 : 3_000_000, maxFramerate: fps },
      degradationPreference: "maintain-resolution" as const,
    };
    try {
      await room.localParticipant.setScreenShareEnabled(true, {
        audio: shareAudio,
        systemAudio: shareAudio ? "include" : "exclude",
        resolution: { width: 1920, height: 1080, frameRate: fps },
        contentHint: "detail",
        surfaceSwitching: "include",
      }, publishOptions);`,
  `    const shareProfiles = {
      "1080p30": { width: 1920, height: 1080, fps: 30, bitrate: 5_000_000 },
      "1080p15": { width: 1920, height: 1080, fps: 15, bitrate: 3_000_000 },
      "720p30": { width: 1280, height: 720, fps: 30, bitrate: 2_500_000 },
      "720p15": { width: 1280, height: 720, fps: 15, bitrate: 1_500_000 },
      "480p30": { width: 854, height: 480, fps: 30, bitrate: 1_200_000 },
      "480p15": { width: 854, height: 480, fps: 15, bitrate: 700_000 },
    } as const;

    const profile = shareQuality === "auto" ? null : shareProfiles[shareQuality];
    const publishOptions = profile ? {
      screenShareEncoding: { maxBitrate: profile.bitrate, maxFramerate: profile.fps },
      degradationPreference: "maintain-resolution" as const,
    } : undefined;

    const captureOptions = {
      audio: shareAudio,
      systemAudio: shareAudio ? "include" as const : "exclude" as const,
      ...(profile ? { resolution: { width: profile.width, height: profile.height, frameRate: profile.fps } } : {}),
      contentHint: "detail" as const,
      surfaceSwitching: "include" as const,
    };

    try {
      await room.localParticipant.setScreenShareEnabled(true, captureOptions, publishOptions);`
);

replace(
  "components/call/settings-modal.tsx",
  '<Select value={shareQuality} onChange={(value) => onShareQuality(value as ShareQuality)} options={[{ value: "auto", label: "Automática" }, { value: "high", label: "Alta — 1080p 30 FPS" }, { value: "balanced", label: "Equilibrada — 1080p 15 FPS" }]} />',
  `<Select value={shareQuality} onChange={(value) => onShareQuality(value as ShareQuality)} options={[
            { value: "auto", label: "Automática — navegador decide" },
            { value: "1080p30", label: "1080p — 30 FPS" },
            { value: "1080p15", label: "1080p — 15 FPS" },
            { value: "720p30", label: "720p — 30 FPS" },
            { value: "720p15", label: "720p — 15 FPS" },
            { value: "480p30", label: "480p — 30 FPS" },
            { value: "480p15", label: "480p — 15 FPS" },
          ]} />
          <p className="mt-2 text-[10px] leading-4 text-zinc-600">480p economiza mais dados, 720p equilibra qualidade e consumo, e 1080p prioriza nitidez. A opção escolhida é usada no próximo compartilhamento.</p>`
);
