"use client";

import { useEffect, useRef, useState } from "react";
import { Expand, Volume2, VolumeX } from "lucide-react";
import { Participant, RemoteParticipant, Track } from "livekit-client";

export function ScreenShareView({
  participant,
  revision,
}: {
  participant: Participant;
  revision: number;
  focused?: boolean;
  onToggleFocus?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousVolumeRef = useRef(1);
  const [volume, setVolume] = useState(1);

  const publication = participant.getTrackPublication(Track.Source.ScreenShare);
  const audioPublication = participant.getTrackPublication(Track.Source.ScreenShareAudio);
  const track = publication?.track;
  const isRemote = participant instanceof RemoteParticipant;
  const hasSharedAudio = Boolean(audioPublication?.track && !audioPublication.isMuted);

  useEffect(() => {
    const saved = Number(localStorage.getItem("lumacall.screenShareVolume"));
    if (Number.isFinite(saved) && saved >= 0 && saved <= 1) {
      setVolume(saved);
      if (saved > 0) previousVolumeRef.current = saved;
    }
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !track) return;
    track.attach(element);
    return () => { track.detach(element); };
  }, [track, revision]);

  useEffect(() => {
    if (!(participant instanceof RemoteParticipant)) return;
    participant.setVolume(volume, Track.Source.ScreenShareAudio);
    localStorage.setItem("lumacall.screenShareVolume", String(volume));
    if (volume > 0) previousVolumeRef.current = volume;
  }, [participant, revision, volume]);

  async function fullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await containerRef.current?.requestFullscreen();
  }

  function toggleMute() {
    setVolume((current) => current > 0 ? 0 : Math.max(previousVolumeRef.current, 0.5));
  }

  return (
    <div ref={containerRef} className="screen-share-frame flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/[.07] bg-[#08090b]">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[.07] bg-[#0d0e11] px-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-zinc-100">
            {participant.name || "Participante"}{participant.isLocal ? " (você)" : ""}
          </div>
          <div className="text-[10px] text-zinc-500">está compartilhando a tela</div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isRemote && (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/[.08] bg-black/25 px-2 py-1" title={hasSharedAudio ? "Volume da transmissão" : "A transmissão não possui áudio compartilhado"}>
              <button
                type="button"
                onClick={toggleMute}
                disabled={!hasSharedAudio}
                className="focus-ring grid size-6 place-items-center rounded-md text-zinc-300 transition hover:bg-white/[.06] disabled:cursor-default disabled:opacity-35"
                aria-label={volume > 0 ? "Silenciar transmissão" : "Ativar áudio da transmissão"}
              >
                {volume > 0 ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
              </button>
              <input
                aria-label="Volume da transmissão"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                disabled={!hasSharedAudio}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="h-1 w-20 accent-violet-400 disabled:opacity-35"
              />
              <span className="w-7 text-right text-[9px] tabular-nums text-zinc-500">{Math.round(volume * 100)}%</span>
            </div>
          )}

          <button
            type="button"
            onClick={fullscreen}
            className="focus-ring grid size-8 place-items-center rounded-lg border border-violet-300/15 bg-violet-300/[.08] text-violet-100 transition hover:bg-violet-300/[.14]"
            title="Tela cheia"
            aria-label="Deixar transmissão em tela cheia"
          >
            <Expand className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-black">
        {track ? (
          <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} className="h-full w-full object-contain" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-zinc-500">Carregando compartilhamento...</div>
        )}
      </div>
    </div>
  );
}
