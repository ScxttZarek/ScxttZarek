"use client";

import { useEffect, useState } from "react";
import { Camera, CameraOff, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function ControlBar({
  micEnabled,
  cameraEnabled,
  screenSharing,
  chatOpen,
  participantsOpen,
  unread,
  onMic,
  onCamera,
  onScreen,
  onSettings,
  onChat,
  onParticipants,
  onLeave,
}: {
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  chatOpen: boolean;
  participantsOpen: boolean;
  unread: number;
  onMic: () => void;
  onCamera: () => void;
  onScreen: () => void;
  onSettings: () => void;
  onChat: () => void;
  onParticipants: () => void;
  onLeave: () => void;
}) {
  const [screenShareSupported, setScreenShareSupported] = useState(false);

  useEffect(() => {
    setScreenShareSupported(Boolean(navigator.mediaDevices?.getDisplayMedia));
  }, []);

  return (
    <div className="control-bar flex h-[76px] shrink-0 items-center justify-center border-t border-white/[.06] bg-[#0a0b0d]/90 px-3 backdrop-blur-xl">
      <div className="control-bar-inner flex items-center gap-2">
        <ControlButton
          title={micEnabled ? "Desativar microfone" : "Ativar microfone"}
          active={micEnabled}
          danger={!micEnabled}
          onClick={onMic}
        >
          {micEnabled ? <Mic className="size-[18px]" /> : <MicOff className="size-[18px]" />}
        </ControlButton>

        <ControlButton
          title={cameraEnabled ? "Desativar câmera" : "Ativar câmera"}
          active={cameraEnabled}
          danger={!cameraEnabled}
          onClick={onCamera}
        >
          {cameraEnabled ? <Camera className="size-[18px]" /> : <CameraOff className="size-[18px]" />}
        </ControlButton>

        {screenShareSupported ? (
          <ControlButton
            title={screenSharing ? "Parar compartilhamento" : "Compartilhar tela"}
            active={screenSharing}
            highlighted={screenSharing}
            onClick={onScreen}
          >
            <MonitorUp className="size-[18px]" />
          </ControlButton>
        ) : (
          <ControlButton
            title="Compartilhamento de tela disponível em navegadores compatíveis"
            disabled
          >
            <MonitorUp className="size-[18px]" />
          </ControlButton>
        )}

        <div className="control-divider mx-1 h-8 w-px bg-white/[.07]" />

        <ControlButton title="Configurações" onClick={onSettings}>
          <Settings className="size-[18px]" />
        </ControlButton>

        <div className="relative">
          <ControlButton title="Chat" highlighted={chatOpen} onClick={onChat}>
            <MessageSquare className="size-[18px]" />
          </ControlButton>
          {unread > 0 && !chatOpen && (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-violet-500 px-1 text-[10px] font-bold leading-5 text-white">
              {Math.min(unread, 99)}
            </span>
          )}
        </div>

        <ControlButton title="Participantes" highlighted={participantsOpen} onClick={onParticipants}>
          <Users className="size-[18px]" />
        </ControlButton>

        <div className="control-divider mx-1 h-8 w-px bg-white/[.07]" />

        <button
          onClick={onLeave}
          title="Sair da chamada"
          aria-label="Sair da chamada"
          className="focus-ring grid size-11 shrink-0 place-items-center rounded-xl border border-red-400/20 bg-red-500/90 text-white transition hover:bg-red-500"
        >
          <PhoneOff className="size-[18px]" />
        </button>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  title,
  active,
  highlighted,
  danger,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  active?: boolean;
  highlighted?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring grid size-11 shrink-0 place-items-center rounded-xl border text-zinc-300 transition",
        "border-white/[.08] bg-white/[.035] hover:bg-white/[.07] hover:text-white",
        active && "text-white",
        highlighted && "border-violet-300/20 bg-violet-300/[.10] text-violet-200",
        danger && "border-red-400/15 bg-red-400/[.08] text-red-200",
        disabled && "cursor-not-allowed opacity-30 hover:bg-white/[.035] hover:text-zinc-300",
      )}
    >
      {children}
    </button>
  );
}
