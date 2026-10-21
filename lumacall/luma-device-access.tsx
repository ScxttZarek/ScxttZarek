"use client";

import { useState } from "react";
import { Camera, Headphones, Mic, ShieldCheck } from "lucide-react";

export const MEDIA_SETUP_KEY = "lumacall.media.setup.v1";
export const MEDIA_MIC_KEY = "lumacall.media.microphone.v1";
export const MEDIA_CAMERA_KEY = "lumacall.media.camera.v1";

export function hasMediaSetup() {
  return typeof window !== "undefined" && localStorage.getItem(MEDIA_SETUP_KEY) === "done";
}

type DeviceAccessProps = {
  onComplete: () => void;
};

export function DeviceAccess({ onComplete }: DeviceAccessProps) {
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState("");

  function finish(microphone: boolean, camera: boolean) {
    localStorage.setItem(MEDIA_MIC_KEY, microphone ? "1" : "0");
    localStorage.setItem(MEDIA_CAMERA_KEY, camera ? "1" : "0");
    localStorage.setItem(MEDIA_SETUP_KEY, "done");
    onComplete();
  }

  async function authorize() {
    if (busy) return;
    setBusy(true);
    setWarning("");
    let microphone = false;
    let camera = false;
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setWarning("Seu navegador não permite acessar microfone e câmera nesta página.");
      setBusy(false);
      return;
    }
    // Captura apenas para conceder permissões: nada é publicado ou gravado.
    async function probe(constraints: MediaStreamConstraints) {
      const stream = await media.getUserMedia(constraints);
      try {
        microphone ||= stream.getAudioTracks().length > 0;
        camera ||= stream.getVideoTracks().length > 0;
      } finally {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
    try {
      await probe({ audio: true, video: true });
    } catch {
      // Se uma permissão foi recusada ou não houver câmera, ainda tenta liberar o microfone.
      try { await probe({ audio: true, video: false }); } catch { /* sem microfone */ }
      try { await probe({ audio: false, video: true }); } catch { /* sem câmera */ }
    }
    if (!microphone || !camera) {
      setWarning("Algum dispositivo não foi autorizado ou não está disponível. Você ainda pode entrar na sala e ativá-lo depois.");
    }
    finish(microphone, camera);
    setBusy(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#090b0f] px-4">
      <section className="w-full max-w-[440px] rounded-[24px] border border-white/[.1] bg-[#171a21] p-6 text-zinc-100 shadow-[0_18px_65px_rgba(0,0,0,.34)] sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl border border-white/[.1] bg-[#262a34] text-[#c1bcff]"><Headphones className="size-6" /></span>
          <div>
            <h1 className="text-lg font-bold tracking-[-.025em]">Preparar seus dispositivos</h1>
            <p className="mt-1 text-xs text-zinc-400">Uma vez, antes de entrar na sala.</p>
          </div>
        </div>
        <p className="mb-5 text-sm leading-6 text-zinc-300">
          Autorize o microfone e a câmera agora. Assim, ao escolher entrar na chamada, não será necessário preencher seu nome nem abrir outra tela.
        </p>
        <div className="mb-5 space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-[#20232b] px-4 py-3 text-xs text-zinc-300"><Mic className="size-4 text-[#beb9f8]" />Microfone <span className="ml-auto text-zinc-500">Permissão antecipada</span></div>
          <div className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-[#20232b] px-4 py-3 text-xs text-zinc-300"><Camera className="size-4 text-[#beb9f8]" />Câmera <span className="ml-auto text-zinc-500">Desligada ao entrar</span></div>
        </div>
        <p className="mb-5 text-xs leading-5 text-zinc-500">
          A câmera continua desligada por padrão. Os dispositivos só serão usados na chamada quando ativados. Você pode mudar tudo depois.
        </p>
        {warning && <p role="status" className="mb-4 text-xs text-amber-200">{warning}</p>}
        <button type="button" disabled={busy} onClick={()=>void authorize()} className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[#bdb8f9] px-4 py-3.5 text-sm font-bold text-[#13141d] transition hover:bg-[#d1ccff] disabled:opacity-60"><ShieldCheck className="size-4" />{busy ? "Solicitando acesso..." : "Permitir microfone e câmera"}</button>
        <button type="button" disabled={busy} onClick={()=>finish(false,false)} className="focus-ring mt-2 w-full rounded-xl px-4 py-3 text-xs font-medium text-zinc-400 hover:bg-[#232630] hover:text-zinc-200 disabled:opacity-50">Agora não — entrar sem permissões</button>
      </section>
    </main>
  );
}
