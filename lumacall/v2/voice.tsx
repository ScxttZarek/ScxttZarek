"use client";
import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom, RoomAudioRenderer, StartAudio, VideoTrack, isTrackReference,
  useConnectionState, useLocalParticipant, useParticipants, useRoomContext, useTracks
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Camera, CameraOff, Headphones, Maximize2, Mic, MicOff, Minimize2, MonitorUp, PhoneOff, Play, Radio, Square, X } from "lucide-react";
import { Avatar } from "./ui-kit";

type Member = {id:string;name:string;badge:string|null;avatar_data_url:string|null};

function CallContent({members,onLeave,roomError}:{members:Member[];onLeave:()=>void;roomError:string}) {
  const room=useRoomContext();
  const connection=useConnectionState(room);
  const participants=useParticipants();
  const {localParticipant,isMicrophoneEnabled,isCameraEnabled,isScreenShareEnabled}=useLocalParticipant();
  const videoTracks=useTracks([Track.Source.Camera,Track.Source.ScreenShare],{onlySubscribed:false}).filter(isTrackReference);
  const screens=videoTracks.filter(track=>track.source===Track.Source.ScreenShare);
  const [viewerIdentity,setViewerIdentity]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const busyRef=useRef(false);
  const [error,setError]=useState("");
  const viewerRef=useRef<HTMLElement|null>(null);
  const [fullscreen,setFullscreen]=useState(false);
  const [expandedFallback,setExpandedFallback]=useState(false);
  const viewedTrack=screens.find(t=>t.participant.identity===viewerIdentity);
  const viewerName=participants.find(p=>p.identity===viewerIdentity)?.name||"participante";
  const connected=connection===ConnectionState.Connected;
  const connectionText=connected
    ? participants.length+"/6 conectados"
    : connection===ConnectionState.Connecting ? "Conectando…"
    : connection===ConnectionState.Disconnected ? "Desconectado" : "Reconectando…";

  useEffect(()=>{
    if(viewerIdentity&&!screens.some(t=>t.participant.identity===viewerIdentity)){
      if(document.fullscreenElement===viewerRef.current)void document.exitFullscreen().catch(()=>undefined);
      setExpandedFallback(false);
      setViewerIdentity(null);
    }
  },[viewerIdentity,screens]);
  useEffect(()=>{
    const sync=()=>setFullscreen(document.fullscreenElement===viewerRef.current);
    document.addEventListener("fullscreenchange",sync);
    return()=>document.removeEventListener("fullscreenchange",sync);
  },[]);
  useEffect(()=>{
    if(!expandedFallback)return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setExpandedFallback(false);};
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[expandedFallback]);

  async function act(work:()=>Promise<unknown>){
    if(busyRef.current)return;
    busyRef.current=true;
    setBusy(true);setError("");
    try{await work();}catch{setError("Não foi possível alterar o dispositivo. Verifique as permissões do navegador.");}
    finally{busyRef.current=false;setBusy(false);}
  }
  function toggleSharing(){
    if(!isScreenShareEnabled&&typeof navigator.mediaDevices?.getDisplayMedia!=="function"){
      setError("Este navegador não permite compartilhar a tela. Você ainda pode assistir às transmissões.");
      return;
    }
    void act(()=>localParticipant.setScreenShareEnabled(!isScreenShareEnabled));
  }
  async function toggleFullscreen(){
    const node=viewerRef.current;if(!node)return;
    if(expandedFallback){setExpandedFallback(false);return;}
    try{
      if(document.fullscreenElement===node)await document.exitFullscreen();
      else if(typeof node.requestFullscreen==="function")await node.requestFullscreen();
      else setExpandedFallback(true);
    }catch{setExpandedFallback(true);}
  }
  function closeViewer(){
    if(document.fullscreenElement===viewerRef.current)void document.exitFullscreen().catch(()=>undefined);
    setExpandedFallback(false);setViewerIdentity(null);
  }
  function leaveCall(){closeViewer();void room.disconnect();onLeave();}

  return <section className="lc-call-layout" aria-label="Chamada de voz">
    <header className="lc-call-header">
      <div className="lc-call-heading">
        <span className="lc-call-eyebrow"><Headphones size={13} aria-hidden="true"/> CANAL DE VOZ</span>
        <h2>Chamada de voz</h2>
        <p>Converse com os membros e escolha quando assistir a uma transmissão.</p>
      </div>
      <span className={"lc-call-status "+(connected?"lc-call-status--online":"lc-call-status--pending")} role="status" aria-live="polite">
        <span className="lc-call-status-dot" aria-hidden="true"/>{connectionText}
      </span>
    </header>
    {isScreenShareEnabled&&<div className="lc-call-sharing" role="status">
      <span><Radio size={16}/> Você está transmitindo sua tela</span>
      <button type="button" disabled={busy} onClick={()=>void act(()=>localParticipant.setScreenShareEnabled(false))}>
        <Square size={13} fill="currentColor"/> Parar transmissão
      </button>
    </div>}
    {(error||roomError)&&<p className="lc-call-error" role="alert">{error||roomError}{error&&<button type="button" aria-label="Fechar aviso" onClick={()=>setError("")}><X size={15}/></button>}</p>}
    {/* Safari/mobile and other browsers may require a new user gesture before
        remote audio can play; LiveKit hides this button when not needed. */}
    <StartAudio label="Ativar áudio da chamada"/>

    <main className={"lc-call-stage"+(viewedTrack?" lc-call-stage--watching":"")}>
      {viewedTrack&&<section ref={viewerRef} className={"lc-call-viewer"+(expandedFallback?" lc-call-viewer--expanded":"")} aria-label={"Transmissão de "+viewerName}>
        <div className="lc-call-viewer-toolbar">
          <div className="lc-call-viewer-name">
            <span className="lc-call-live"><Radio size={12}/> AO VIVO</span>
            <strong title={viewerName}>{viewerIdentity===localParticipant.identity?"Sua transmissão":"Transmissão de "+viewerName}</strong>
          </div>
          <div className="lc-call-viewer-actions">
            <button type="button" onClick={()=>void toggleFullscreen()} aria-label={fullscreen||expandedFallback?"Sair da tela cheia":"Tela cheia"} title={fullscreen||expandedFallback?"Sair da tela cheia":"Tela cheia"}>
              {fullscreen||expandedFallback?<Minimize2 size={16}/>:<Maximize2 size={16}/>}<span>{fullscreen||expandedFallback?"Sair da tela cheia":"Tela cheia"}</span>
            </button>
            <button type="button" onClick={closeViewer} aria-label="Fechar visualização"><X size={16}/><span>Fechar</span></button>
          </div>
        </div>
        <div className="lc-call-video-surface"><VideoTrack trackRef={viewedTrack}/></div>
      </section>}
      <div className={"lc-call-participants"+(viewedTrack?" lc-call-participants--strip":"")} role="list" aria-label="Participantes da chamada">
        {participants.map(p=>{
          const member=members.find(m=>m.id===p.identity);
          const name=p.name||member?.name||"Participante";
          const own=p.identity===localParticipant.identity;
          const camera=videoTracks.find(t=>t.participant.identity===p.identity&&t.source===Track.Source.Camera);
          const screen=screens.find(t=>t.participant.identity===p.identity);
          const active=Boolean(viewedTrack&&viewerIdentity===p.identity);
          return <article className="lc-call-tile" key={p.identity} role="listitem">
            <div className="lc-call-tile-media">
              {camera?<VideoTrack trackRef={camera}/>:<Avatar name={name} src={member?.avatar_data_url} badge={member?.badge} size={viewedTrack?56:86}/>}
            </div>
            {screen&&<div className="lc-call-tile-stream">
              <span><Radio size={12}/>{own?"Sua transmissão":"Transmitindo"}</span>
              <button type="button" onClick={()=>active?closeViewer():setViewerIdentity(p.identity)}
                aria-label={active?"Fechar transmissão de "+name:own?"Ver prévia":"Assistir transmissão de "+name}>
                {active?<X size={13}/>:<Play size={13} fill="currentColor"/>}
                {active?"Fechar":own?"Ver prévia":"Assistir transmissão"}
              </button>
            </div>}
            <div className="lc-call-tile-footer">
              <strong title={name}>{name}{own?" (você)":""}</strong>
              {!p.isMicrophoneEnabled&&<MicOff size={15} aria-label="Microfone desligado"/>}
            </div>
          </article>;
        })}
      </div>
    </main>
    <footer className="lc-call-dock" aria-label="Controles da chamada">
      <div className="lc-call-dock-group">
        <button type="button" disabled={busy} className={"lc-call-control"+(!isMicrophoneEnabled?" lc-call-control--off":"")}
          title={isMicrophoneEnabled?"Desligar microfone":"Ligar microfone"}
          aria-label={isMicrophoneEnabled?"Desligar microfone":"Ligar microfone"} aria-pressed={isMicrophoneEnabled}
          onClick={()=>void act(()=>localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled))}>{isMicrophoneEnabled?<Mic size={20}/>:<MicOff size={20}/>}</button>
        <button type="button" disabled={busy} className={"lc-call-control"+(!isCameraEnabled?" lc-call-control--off":"")}
          title={isCameraEnabled?"Desligar câmera":"Ligar câmera"} aria-label={isCameraEnabled?"Desligar câmera":"Ligar câmera"}
          aria-pressed={isCameraEnabled} onClick={()=>void act(()=>localParticipant.setCameraEnabled(!isCameraEnabled))}>{isCameraEnabled?<Camera size={20}/>:<CameraOff size={20}/>}</button>
        <button type="button" disabled={busy} className={"lc-call-control"+(isScreenShareEnabled?" lc-call-control--sharing":"")}
          title={isScreenShareEnabled?"Parar transmissão":"Compartilhar tela"}
          aria-label={isScreenShareEnabled?"Parar transmissão":"Compartilhar tela"}
          aria-pressed={isScreenShareEnabled} onClick={toggleSharing}>{isScreenShareEnabled?<Square size={19} fill="currentColor"/>:<MonitorUp size={20}/>}</button>
        <span className="lc-call-dock-separator" aria-hidden="true"/>
        <button type="button" className="lc-call-control lc-call-control--hangup" title="Desligar chamada" aria-label="Desligar chamada" onClick={leaveCall}><PhoneOff size={20}/></button>
      </div>
      <span className="lc-call-dock-label">Chamada de voz</span>
    </footer>
  </section>;
}

export function VoiceRoom({token,url,members,onLeave,visible}:{
  token:string;url:string;members:Member[];onLeave:()=>void;visible:boolean;
}){
  const [roomError,setRoomError]=useState("");
  const leaveNotified=useRef(false);
  useEffect(()=>{leaveNotified.current=false;setRoomError("");},[token]);
  function notifyLeave(){
    if(leaveNotified.current)return;
    leaveNotified.current=true;
    onLeave();
  }
  return <div className={visible?"lc-call-root":"lc-call-root lc-call-root--hidden"}>
    <LiveKitRoom className="lc-call-provider" token={token} serverUrl={url} connect
      audio={false} video={false} options={{adaptiveStream:true,dynacast:true}}
      onDisconnected={notifyLeave} onError={()=>setRoomError("Não foi possível conectar todos os recursos da chamada. Verifique sua conexão e tente novamente.")}>
      <RoomAudioRenderer/><CallContent members={members} onLeave={notifyLeave} roomError={roomError}/>
    </LiveKitRoom>
  </div>;
}
