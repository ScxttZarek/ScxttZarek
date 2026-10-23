"use client";
import { useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, useParticipants, useRoomContext, useTracks, VideoTrack, isTrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Camera, CameraOff, Headphones, Mic, MicOff, MonitorUp, PhoneOff, Video } from "lucide-react";
type Member = {id:string;name:string;badge:string|null;avatar_data_url:string|null};
function Avatar({name,src,size=48}:{name:string;src?:string|null;size?:number}){
  return src?<img src={src} alt="" className="v2-avatar" style={{width:size,height:size}}/>:<span className="v2-avatar v2-avatar-fallback" style={{width:size,height:size,fontSize:Math.round(size*.38)}}>{(name||"?").slice(0,1).toUpperCase()}</span>;
}
function VoiceInside({members,onLeave}:{members:Member[];onLeave:()=>void}){
  const room=useRoomContext();
  const participants=useParticipants();
  const [error,setError]=useState("");
  const tracks=useTracks([Track.Source.Camera,Track.Source.ScreenShare],{onlySubscribed:false}).filter(isTrackReference);
  const screen=tracks.find(x=>x.source===Track.Source.ScreenShare);
  async function action(fn:()=>Promise<unknown>){try{setError("");await fn();}catch{setError("Verifique as permissões do navegador e tente novamente.");}}
  return <div className="v2-voice-body">
    <div className="v2-voice-heading"><div><h2>Chamada de voz</h2><p>Até seis pessoas • áudio e vídeo em tempo real</p></div><span className="v2-online">{participants.length}/6 conectados</span></div>
    {error&&<p className="v2-error" role="alert">{error}</p>}
    {screen&&<div className="v2-screen-feed"><VideoTrack trackRef={screen}/></div>}
    <div className="v2-voice-grid">
      {participants.map(participant=>{
        const user=members.find(m=>m.id===participant.identity);
        const camera=tracks.find(x=>x.participant.identity===participant.identity&&x.source===Track.Source.Camera);
        return <div className="v2-voice-tile" key={participant.identity}>
          {camera?<VideoTrack trackRef={camera}/>:<Avatar name={participant.name||user?.name||"?"} src={user?.avatar_data_url} size={84}/>}
          <div className="v2-voice-tile-bottom"><strong>{participant.name||user?.name||"Participante"}</strong>{!participant.isMicrophoneEnabled&&<MicOff size={15}/>}</div>
        </div>
      })}
    </div>
    <div className="v2-voice-controls">
      <button type="button" aria-label="Alternar microfone" title="Microfone" className={room.localParticipant.isMicrophoneEnabled?"":"v2-muted"} onClick={()=>void action(()=>room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled))}>{room.localParticipant.isMicrophoneEnabled?<Mic/>:<MicOff/>}</button>
      <button type="button" title="Câmera" aria-label="Alternar câmera" className={room.localParticipant.isCameraEnabled?"":"v2-muted"} onClick={()=>void action(()=>room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled))}>{room.localParticipant.isCameraEnabled?<Camera/>:<CameraOff/>}</button>
      <button type="button" title="Compartilhar tela" aria-label="Compartilhar tela" className={room.localParticipant.isScreenShareEnabled?"v2-sharing":""} onClick={()=>void action(()=>room.localParticipant.setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled))}><MonitorUp/></button>
      <button type="button" title="Desligar" aria-label="Desligar" className="v2-hangup" onClick={()=>{void room.disconnect();onLeave()}}><PhoneOff/></button>
    </div>
  </div>;
}
export function VoiceRoom({token,url,members,onLeave,visible}:{token:string;url:string;members:Member[];onLeave:()=>void;visible:boolean}){
  return <div className={visible?"v2-voice-wrapper":"v2-voice-wrapper v2-voice-hidden"}>
    <LiveKitRoom token={token} serverUrl={url} connect audio={false} video={false} options={{adaptiveStream:true,dynacast:true}} onDisconnected={onLeave} onError={()=>{}}>
      <RoomAudioRenderer/>
      <VoiceInside members={members} onLeave={onLeave}/>
    </LiveKitRoom>
  </div>;
}
