"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { Hash, Send, MessageCircle } from "lucide-react";
import { sanitizeChatMessage } from "@/lib/utils";
import { reservedAvatarForBadge } from "@/lib/reserved-profile";
import { CHAT_MAX } from "@/lib/constants";

export type GeneralMessage = {
  id: string;
  time: number;
  name: string;
  text: string;
  badge?: string;
};

const titles:Record<string,string>={
  creator:"CRIADOR",editor:"EDITOR",imperio_sohlar:"IMPÉRIO SOHLAR",
  princesa_tess:"PRINCESA TESS",bolacha_oreo:"BOLACHAOREO"
};
const colors:Record<string,string>={
  creator:"text-violet-200",editor:"text-cyan-200",imperio_sohlar:"text-amber-200",
  princesa_tess:"text-pink-200",bolacha_oreo:"text-zinc-100"
};
function avatarFor(badge?:string) {
  if(badge==="princesa_tess")return "/avatars/shine.webp";
  if(badge==="bolacha_oreo")return "/avatars/aldron.webp";
  if(badge==="creator" || badge==="editor" || badge==="imperio_sohlar") return reservedAvatarForBadge(badge);
  return null;
}

export function LumaGeneralChat({
  messages,onSend,connected,loading=false
}:{
  messages:GeneralMessage[];
  onSend:(text:string)=>Promise<void>;
  connected:boolean;
  loading?:boolean;
}) {
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent) {
    event.preventDefault();
    const text=sanitizeChatMessage(draft);
    if(!text||!connected||busy)return;
    setBusy(true);setError("");
    try{await onSend(text);setDraft("");}
    catch{setError("Não foi possível enviar a mensagem.");}
    finally{setBusy(false);}
  }
  function keyDown(e:KeyboardEvent<HTMLTextAreaElement>){
    if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}
  }
  return <section className="lc-general-chat flex h-full min-h-0 w-full flex-col bg-[#111318]">
    <div className="lc-general-history min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
      {messages.length===0 ? (
        <div className="mx-auto flex h-full max-w-3xl flex-col justify-end pb-8">
          <span className="mb-4 grid size-14 place-items-center rounded-2xl border border-white/[.09] bg-[#20242e] text-[#c8c5ff]"><Hash className="size-7" /></span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Bem-vindo ao #geral</h2>
          <p className="mt-1 text-sm text-zinc-500">As mensagens aparecem em tempo real para quem estiver nesta sala, mesmo sem entrar na chamada.</p>
          {!connected&&<p className="mt-3 text-xs text-amber-300">{loading?"Conectando ao canal geral...":"Chat temporariamente indisponível. Reabra a sala para tentar novamente."}</p>}
        </div>
      ):(
        <div className="mx-auto max-w-4xl space-y-0.5">
          {messages.map(item=>{
            const avatar=avatarFor(item.badge);
            return <article key={item.id} className="lc-general-message group flex gap-3 rounded-xl px-2 py-3 hover:bg-[#1a1e26]">
              <div className="mt-0.5 grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/[.1] bg-[#2b2e38] text-sm font-bold text-zinc-300">
                {avatar?<img src={avatar} alt="" className="size-full object-cover" />:item.name.slice(0,1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={"text-[13px] font-bold "+(colors[item.badge||""]||"text-zinc-100")}>{item.name}</span>
                  {item.badge&&titles[item.badge]&&<span title={titles[item.badge]} className={"lc-general-badge lc-general-badge-"+item.badge}>{titles[item.badge]}</span>}
                  <time dateTime={new Date(item.time).toISOString()} className="text-[10px] text-zinc-500">{new Date(item.time).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</time>
                </div>
                <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.6] text-zinc-300">{item.text}</p>
              </div>
            </article>;
          })}
        </div>
      )}
    </div>
    <form onSubmit={submit} className="shrink-0 border-t border-white/[.07] px-3 py-3 sm:px-7 sm:py-5">
      <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-xl border border-[#373a47] bg-[#232630] p-2 focus-within:border-[#8d88c9]">
        <MessageCircle className="mb-2.5 ml-2 hidden size-4 shrink-0 text-zinc-500 sm:block"/>
        <textarea aria-label="Mensagem no chat geral" rows={2} maxLength={CHAT_MAX}
          value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={keyDown}
          disabled={!connected||busy} placeholder={connected?"Conversar em #geral":"Aguardando conexão do chat..."}
          className="min-h-[42px] max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-[13px] leading-5 text-zinc-100 outline-none placeholder:text-zinc-500 disabled:opacity-45"/>
        <button type="submit" disabled={!connected||busy||!sanitizeChatMessage(draft)}
          aria-label="Enviar ao chat geral"
          className="focus-ring mb-1 grid size-10 shrink-0 place-items-center rounded-lg bg-[#bbb7f6] text-[#11131c] hover:bg-[#d0cdff] disabled:opacity-30">
          <Send className="size-4"/>
        </button>
      </div>
      {error&&<p className="mx-auto mt-2 max-w-4xl text-xs text-rose-300">{error}</p>}
      <p className="mx-auto mt-2 max-w-4xl text-[10px] text-zinc-600">Enter envia • Shift + Enter quebra a linha • Chat ao vivo, sem histórico permanente</p>
    </form>
  </section>;
}
