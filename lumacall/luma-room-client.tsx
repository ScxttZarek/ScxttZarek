"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LiveKitRoom } from "@livekit/components-react";
import { Room, RoomEvent, RemoteParticipant } from "livekit-client";
import { ArrowLeft, Copy, Headphones, Hash } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { DISPLAY_NAME_KEY, RESERVED_NAME_PROOF_KEY, NameModal } from "@/components/ui/name-modal";
import { PreJoin } from "@/components/call/pre-join";
import { CallRoom } from "@/components/call/call-room";
import { LumaGeneralChat, GeneralMessage } from "@/components/call/luma-general-chat";
import { MobileGate } from "@/components/ui/mobile-gate";
import { sanitizeChatMessage, sanitizeDisplayName } from "@/lib/utils";
import type { AppSession, PreJoinPreferences } from "@/types/call";

const sessionKey = (roomId: string) => "lumacall.session." + roomId;
const topic = "lumacall-general-v1";
type Phase = "lobby" | "prejoin" | "connecting" | "call";

function badgeOf(metadata?: string) {
  try {const badge = JSON.parse(metadata||"{}").badge;return typeof badge==="string"?badge:undefined;}
  catch{return undefined;}
}

export function RoomClient({ roomId }: { roomId: string }) {
  const [phase,setPhase]=useState<Phase>("lobby");
  const [preferences,setPreferences]=useState<PreJoinPreferences|null>(null);
  const [token,setToken]=useState("");
  const [serverUrl,setServerUrl]=useState("");
  const [session,setSession]=useState<AppSession|null>(null);
  const [error,setError]=useState("");
  const [displayName,setDisplayName]=useState("");
  const [proof,setProof]=useState("");
  const [nameOpen,setNameOpen]=useState(false);
  const [lobbyRoom,setLobbyRoom]=useState<Room|null>(null);
  const [lobbyLoading,setLobbyLoading]=useState(true);
  const [messages,setMessages]=useState<GeneralMessage[]>([]);
  const lobbyRef=useRef<Room|null>(null);

  useEffect(()=>{
    const saved=sanitizeDisplayName(localStorage.getItem(DISPLAY_NAME_KEY)||"");
    const savedProof=localStorage.getItem(RESERVED_NAME_PROOF_KEY)||"";
    const reserved=["ohenrique","userqubo","nandobc0","shine","aldron"].includes(saved.toLocaleLowerCase("pt-BR"));
    setDisplayName(saved);setProof(savedProof);
    if(!saved||(reserved&&!savedProof))setNameOpen(true);
  },[]);

  useEffect(()=>{
    if(!displayName)return;
    let canceled=false;
    let active:Room|null=null;
    setLobbyLoading(true);
    setLobbyRoom(null);
    async function connect() {
      try{
        const response=await fetch("/api/livekit/lobby-token",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({roomId,displayName,reservedNameProof:proof})});
        const payload=await response.json();
        if(!response.ok){if(payload.reservedNameRequired)setNameOpen(true);throw Error(payload.error||"O chat geral não pôde ser iniciado.");}
        if(canceled)return;
        const conn=new Room({adaptiveStream:false,dynacast:false});
        active=conn;
        const onData=(bytes:Uint8Array,from?:RemoteParticipant,kind?:unknown,messageTopic?:string)=>{
          if(messageTopic!==topic||!from)return;
          try{
            const data=JSON.parse(new TextDecoder().decode(bytes)) as {id?:string;text?:string;time?:number};
            if(typeof data.id!=="string"||data.id.length>80||typeof data.text!=="string"||data.text.length>4000)return;
            const text=sanitizeChatMessage(data.text);
            if(!text)return;
            const time=typeof data.time==="number"&&Math.abs(Date.now()-data.time)<600000?data.time:Date.now();
            const next:GeneralMessage={id:from.identity+":"+data.id,name:from.name||"Participante",text,time,badge:badgeOf(from.metadata)};
            setMessages(prev=>prev.some(msg=>msg.id===next.id)?prev:[...prev.slice(-199),next]);
          }catch{}
        };
        conn.on(RoomEvent.DataReceived,onData);
        await conn.connect(payload.serverUrl,payload.token);
        if(canceled){await conn.disconnect();return;}
        lobbyRef.current=conn;setLobbyRoom(conn);
        setLobbyLoading(false);
      }catch(e){if(!canceled){setLobbyLoading(false);setError(e instanceof Error?e.message:"Falha no chat geral.");}}
    }
    void connect();
    return ()=>{canceled=true;if(lobbyRef.current===active)lobbyRef.current=null;void active?.disconnect();};
  },[roomId,displayName,proof]);

  const sendGeneral = useCallback(async(text:string)=>{
    const conn=lobbyRef.current;
    if(!conn)throw Error("Chat desconectado");
    const clean=sanitizeChatMessage(text);
    if(!clean)return;
    const id=crypto.randomUUID(),time=Date.now();
    await conn.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({id,time,text:clean})),{reliable:true,topic});
    setMessages(prev=>[...prev.slice(-199),{id:conn.localParticipant.identity+":"+id,name:conn.localParticipant.name||displayName,text:clean,time,badge:badgeOf(conn.localParticipant.metadata)}]);
  },[displayName]);

  const generalChat=<LumaGeneralChat messages={messages} onSend={sendGeneral} connected={Boolean(lobbyRoom)} loading={lobbyLoading}/>;

  const audioOptions=useMemo(()=>preferences?.micEnabled?{
    deviceId:preferences.microphoneId||undefined,echoCancellation:true,noiseSuppression:true,autoGainControl:true
  }:false,[preferences]);
  const videoOptions=useMemo(()=>preferences?.cameraEnabled?{
    deviceId:preferences.cameraId||undefined,resolution:{width:1280,height:720,frameRate:30}
  }:false,[preferences]);

  async function join(next:PreJoinPreferences){
    setPreferences(next);setPhase("connecting");setError("");
    try{
      const resumeToken=sessionStorage.getItem(sessionKey(roomId))||undefined;
      const response=await fetch("/api/livekit/token",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({roomId,displayName:next.displayName,resumeToken,reservedNameProof:next.reservedNameProof})});
      const payload=await response.json();
      if(!response.ok)throw Error(payload.error||"Não foi possível entrar na chamada.");
      const nextSession:AppSession={token:payload.appSession,role:payload.role,identity:payload.identity,locked:Boolean(payload.locked)};
      sessionStorage.setItem(sessionKey(roomId),nextSession.token);
      setSession(nextSession);setToken(payload.token);setServerUrl(payload.serverUrl);setPhase("call");
    }catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível entrar na chamada.");setPhase("prejoin");}
  }
  function updateSession(next:AppSession){sessionStorage.setItem(sessionKey(roomId),next.token);setSession(next);}

  return <><MobileGate /><div className="desktop-shell h-dvh overflow-hidden">
    {phase==="lobby"&&(
      <div className="lc-lobby flex h-full flex-col bg-[#0b0d11]">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[.07] bg-[#111319] px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-2 sm:gap-3"><span className="hidden font-mono text-xs text-zinc-500 sm:inline">{roomId}</span><button type="button" onClick={()=>void navigator.clipboard.writeText(window.location.href)} className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-white/[.08] bg-[#242832] px-3 py-2 text-xs text-zinc-200 hover:bg-[#313646]"><Copy className="size-3.5"/>Convite</button><Link href="/" className="focus-ring rounded-lg border border-white/[.08] bg-[#1c2028] px-3 py-2 text-xs text-zinc-300 hover:bg-[#2a2e37]">Sair da sala</Link></div>
        </header>
        <div className="flex min-h-0 flex-1">
          <aside className="lc-lobby-sidebar flex w-[238px] shrink-0 flex-col border-r border-white/[.08] bg-[#101216]">
            <div className="border-b border-white/[.07] px-4 py-4"><p className="text-xs font-bold text-zinc-200">Sala {roomId}</p><p className="mt-1 text-[10px] text-zinc-500">Conversa geral</p></div>
            <div className="flex-1 px-2 py-4">
              <div className="lc-sidebar-entry lc-selected flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold"><Hash className="size-4"/>geral</div>
              <p className="mt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-[.13em] text-zinc-500">Chamadas</p>
              <button onClick={()=>setPhase("prejoin")} className="lc-sidebar-entry flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-zinc-300"><Headphones className="size-4 shrink-0"/>Entrar na chamada</button>
            </div>
            <div className="border-t border-white/[.07] p-3"><button type="button" onClick={()=>setPhase("prejoin")} className="focus-ring w-full rounded-xl bg-[#bbb6f6] px-3 py-3 text-xs font-bold text-[#101118] hover:bg-[#d0ccff]">Entrar na chamada</button></div>
          </aside>
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-white/[.08] bg-[#15171c] px-5 text-xs font-bold text-zinc-100"><Hash className="size-4 text-zinc-500"/> geral</div>
            <div className="min-h-0 flex-1">{generalChat}</div>
          </main>
        </div>
      </div>
    )}
    {(phase==="prejoin"||phase==="connecting")&&<>
      <div className="absolute right-4 top-[76px] z-20"><button type="button" onClick={()=>{if(phase!=="connecting")setPhase("lobby")}} disabled={phase==="connecting"} className="focus-ring flex items-center gap-1.5 rounded-xl bg-[#232631] px-3 py-2 text-xs text-zinc-300 disabled:opacity-40"><ArrowLeft className="size-3.5"/>Voltar ao chat</button></div>
      <PreJoin roomId={roomId} onJoin={join} busy={phase==="connecting"} error={error}/>
    </>}
    {phase==="call"&&preferences&&session&&(
      <LiveKitRoom token={token} serverUrl={serverUrl} connect audio={audioOptions} video={videoOptions}
        options={{adaptiveStream:true,dynacast:true,disconnectOnPageLeave:true}}
        onError={reason=>setError(reason.message||"Falha na conexão.")}
        onDisconnected={()=>setPhase("lobby")}>
        <CallRoom roomId={roomId} appSession={session} onSessionChange={updateSession} onLeave={()=>setPhase("lobby")} generalChatNode={generalChat}/>
      </LiveKitRoom>
    )}
  </div>
  <NameModal open={nameOpen} initialName={displayName}
    onClose={displayName?()=>setNameOpen(false):undefined}
    onSave={name=>{setDisplayName(name);setProof(localStorage.getItem(RESERVED_NAME_PROOF_KEY)||"");setNameOpen(false);}}/>
  </>;
}
