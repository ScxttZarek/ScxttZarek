"use client";
import { useEffect, useRef, useState } from "react";
import { reservedAvatarForBadge } from "@/lib/reserved-profile";
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useParticipants, useRoomContext, useTracks, VideoTrack, isTrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Camera, CameraOff, Mic, MicOff, MonitorUp, PhoneOff, Play, X, Radio, Square, Maximize2, Minimize2 } from "lucide-react";

type Member = { id:string; name:string; badge:string|null; avatar_data_url:string|null };
function Avatar({ name, src, badge, size=70 }:{ name:string; src?:string|null; badge?:string|null; size?:number }) {
  const reserved = badge==="princesa_tess"?"/avatars/shine.webp":badge==="bolacha_oreo"?"/avatars/aldron.webp":reservedAvatarForBadge(badge||undefined);
  const image = src || reserved;
  return image?<img src={image} alt="" className="v2-avatar" style={{width:size,height:size}}/>:<span className="v2-avatar v2-avatar-fallback" style={{width:size,height:size,fontSize:size*.38}}>{name.charAt(0).toUpperCase()}</span>;
}
function VoiceInside({members,onLeave}:{members:Member[];onLeave:()=>void}){
  const room=useRoomContext();
  const participants=useParticipants();
  const {localParticipant,isMicrophoneEnabled,isCameraEnabled,isScreenShareEnabled}=useLocalParticipant();
  const tracks=useTracks([Track.Source.Camera,Track.Source.ScreenShare],{onlySubscribed:false}).filter(isTrackReference);
  const screens=tracks.filter(track=>track.source===Track.Source.ScreenShare);
  const [watching,setWatching]=useState<string|null>(null);
  const viewerRef=useRef<HTMLElement|null>(null);
  const [fullscreen,setFullscreen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const playing=screens.find(t=>t.participant.identity===watching);
  const watchingName=participants.find(p=>p.identity===watching)?.name||"participante";
  useEffect(()=>{if(watching&&!playing)setWatching(null);},[watching,playing]);
  useEffect(()=>{
    const sync=()=>setFullscreen(document.fullscreenElement===viewerRef.current);
    document.addEventListener("fullscreenchange",sync);
    return ()=>document.removeEventListener("fullscreenchange",sync);
  },[]);
  async function toggleFullscreen(){
    const node=viewerRef.current;
    if(!node)return;
    try{
      if(document.fullscreenElement===node)await document.exitFullscreen();
      else await node.requestFullscreen();
    }catch{
      setError("Não foi possível abrir em tela cheia neste navegador.");
    }
  }
  function closeViewer(){
    if(document.fullscreenElement===viewerRef.current)void document.exitFullscreen().catch(()=>{});
    setWatching(null);
  }
  async function act(fn:()=>Promise<unknown>){
    if(busy)return;
    setBusy(true);setError("");
    try{await fn();}catch{setError("Não foi possível alterar a transmissão ou o dispositivo. Verifique as permissões.");}finally{setBusy(false);}
  }
  const stopSharing=()=>void act(()=>localParticipant.setScreenShareEnabled(false));
  return <section className="v2-voice-body" aria-label="Chamada de voz">
    <header className="v2-voice-heading">
      <div className="v2-voice-heading-label"><h2>Chamada de voz</h2><p>Assista às transmissões quando quiser</p></div>
      <span className="v2-online">{participants.length}/6 conectados</span>
    </header>
    {isScreenShareEnabled&&<div className="v2-share-status">
      <span><Radio size={16}/> Você está compartilhando a tela</span>
      <button type="button" disabled={busy} onClick={stopSharing} aria-label="Parar transmissão"><Square size={13} fill="currentColor"/> Parar transmissão</button>
    </div>}
    {error&&<p className="v2-error v2-voice-error" role="alert">{error}</p>}
    <div className={playing?"v2-voice-stage v2-voice-stage-watching":"v2-voice-stage"}>
      {playing&&<section ref={viewerRef} className="v2-stream-viewer" aria-label="Transmissão em exibição">
        <div className="v2-stream-title"><span><Radio size={14}/> Transmissão de {watchingName} <b>AO VIVO</b></span>
          <div className="v2-stream-title-actions">
            <button type="button" onClick={()=>void toggleFullscreen()} aria-label={fullscreen?"Sair da tela cheia":"Tela cheia"} title={fullscreen?"Sair da tela cheia":"Ampliar transmissão em tela cheia"}>
              {fullscreen?<Minimize2 size={16}/>:<Maximize2 size={16}/>} <span>{fullscreen?"Sair da tela cheia":"Tela cheia"}</span>
            </button>
            <button type="button" onClick={closeViewer} aria-label="Parar de assistir"><X size={16}/> <span>Fechar</span></button>
          </div>
        </div>
        <div className="v2-stream-player"><VideoTrack trackRef={playing}/></div>
      </section>}
      <div className="v2-voice-grid">
        {participants.map(p=>{
          const member=members.find(m=>m.id===p.identity);
          const cam=tracks.find(t=>t.participant.identity===p.identity&&t.source===Track.Source.Camera);
          const stream=screens.find(t=>t.participant.identity===p.identity);
          const own=p.identity===localParticipant.identity;
          const name=p.name||member?.name||"Participante";
          const active=playing&&watching===p.identity;
          return <article className="v2-voice-tile" key={p.identity}>
            <div className="v2-tile-media">{cam?<VideoTrack trackRef={cam}/>:<Avatar name={name} src={member?.avatar_data_url} badge={member?.badge} size={playing?52:78}/>}</div>
            {stream&&<div className="v2-stream-invite">
              <span><Radio size={12}/> {own?"Sua transmissão":"Transmitindo tela"}</span>
              <button type="button" onClick={()=>active?closeViewer():setWatching(p.identity)} aria-label={active?"Parar de assistir": "Assistir transmissão de "+name}>
                {active?<X size={13}/>:<Play size={13} fill="currentColor"/>}
                {active?"Fechar transmissão":own?"Ver prévia":"Assistir transmissão"}
              </button>
            </div>}
            <div className="v2-voice-tile-bottom"><strong>{name}{own?" (você)":""}</strong>{!p.isMicrophoneEnabled&&<MicOff size={14}/>}</div>
          </article>;
        })}
      </div>
    </div>
    <footer className="v2-voice-controls" aria-label="Controles da chamada">
      <button type="button" disabled={busy} className={!isMicrophoneEnabled?"v2-muted":""} title={isMicrophoneEnabled?"Desligar microfone":"Ligar microfone"} aria-label="Alternar microfone" onClick={()=>void act(()=>localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled))}>{isMicrophoneEnabled?<Mic/>:<MicOff/>}</button>
      <button type="button" disabled={busy} className={!isCameraEnabled?"v2-muted":""} title={isCameraEnabled?"Desligar câmera":"Ligar câmera"} aria-label="Alternar câmera" onClick={()=>void act(()=>localParticipant.setCameraEnabled(!isCameraEnabled))}>{isCameraEnabled?<Camera/>:<CameraOff/>}</button>
      <button type="button" disabled={busy} className={isScreenShareEnabled?"v2-sharing":""} title={isScreenShareEnabled?"Parar transmissão":"Compartilhar tela"} aria-label={isScreenShareEnabled?"Parar transmissão":"Compartilhar tela"} aria-pressed={isScreenShareEnabled} onClick={()=>void act(()=>localParticipant.setScreenShareEnabled(!isScreenShareEnabled))}>{isScreenShareEnabled?<Square fill="currentColor"/>:<MonitorUp/>}</button>
      <button type="button" className="v2-hangup" title="Desligar chamada" aria-label="Desligar chamada" onClick={()=>{void room.disconnect();onLeave();}}><PhoneOff/></button>
    </footer>
  </section>;
}
export function VoiceRoom({token,url,members,onLeave,visible}:{token:string;url:string;members:Member[];onLeave:()=>void;visible:boolean}){
  return <div className={visible?"v2-voice-wrapper":"v2-voice-wrapper v2-voice-hidden"}>
    <LiveKitRoom token={token} serverUrl={url} connect audio={false} video={false} options={{adaptiveStream:true,dynacast:true}} onDisconnected={onLeave} onError={()=>{}}>
      <RoomAudioRenderer/><VoiceInside members={members} onLeave={onLeave}/>
    </LiveKitRoom>
  </div>;
}
