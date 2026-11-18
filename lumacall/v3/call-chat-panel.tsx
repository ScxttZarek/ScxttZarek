"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Avatar } from "../v2/ui-kit";
import { apiV3,updateError,type ChatMessage } from "./client";

type CallPage={messages:ChatMessage[];nextCursor:string|null};
function mergeCall(previous:ChatMessage[],incoming:ChatMessage[]):ChatMessage[]{
 const byId=new Map(previous.map(message=>[message.id,message] as const));
 for(const message of incoming)byId.set(message.id,message);
 return [...byId.values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:BigInt(a.id)>BigInt(b.id)?1:0);
}

export function CallChatPanel({channelId,onClose}:{channelId:string;onClose:()=>void}){
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const [olderCursor,setOlderCursor]=useState<string|null>(null);
 const [olderLoading,setOlderLoading]=useState(false);
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const scroll=useRef<HTMLDivElement>(null);
 const follow=useRef(true);
 const initialized=useRef(false);
 const sequence=useRef(0);
 const currentChannel=useRef(channelId);
 const restoreScroll=useRef<{height:number;top:number}|null>(null);
 useEffect(()=>{
  let live=true;
  currentChannel.current=channelId;
  initialized.current=false;
  follow.current=true;
  restoreScroll.current=null;
  setOlderCursor(null);
  setOlderLoading(false);
  setMessages([]);
  setError("");
  const update=async()=>{
   if(document.visibilityState==="hidden")return;
   const requestNumber=++sequence.current;
   try{
    const data=await apiV3<CallPage>("/api/v3/call-messages?channelId="+encodeURIComponent(channelId));
    if(!live||currentChannel.current!==channelId||sequence.current!==requestNumber)return;
    setMessages(previous=>mergeCall(previous,data.messages));
    if(!initialized.current){initialized.current=true;setOlderCursor(data.nextCursor);}
    setError("");
   }catch(e){if(live&&currentChannel.current===channelId&&sequence.current===requestNumber)setError(updateError(e));}
  };
  void update();
  const timer=window.setInterval(()=>void update(),3500);
  const onVisible=()=>{if(document.visibilityState==="visible")void update();};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{live=false;sequence.current++;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisible);};
 },[channelId]);
 useEffect(()=>{
  const el=scroll.current,saved=restoreScroll.current;
  if(el&&saved){el.scrollTop=saved.top+el.scrollHeight-saved.height;restoreScroll.current=null;}
 },[messages]);
 useEffect(()=>{
  if(follow.current&&scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;
 },[messages[messages.length-1]?.id]);
 async function loadOlder(){
  if(!olderCursor||olderLoading)return;
  const id=channelId,cursor=olderCursor;
  const el=scroll.current,saved={height:el?.scrollHeight||0,top:el?.scrollTop||0};
  setOlderLoading(true);follow.current=false;
  try{
   const data=await apiV3<CallPage>("/api/v3/call-messages?channelId="+encodeURIComponent(id)+"&before="+encodeURIComponent(cursor));
   if(currentChannel.current!==id)return;
   restoreScroll.current=saved;
   setMessages(previous=>mergeCall(previous,data.messages));
   setOlderCursor(data.nextCursor);
  }catch(e){if(currentChannel.current===id)setError(updateError(e));}
  finally{if(currentChannel.current===id)setOlderLoading(false);}
 }
 async function send(e:FormEvent){
  e.preventDefault();if(!draft.trim()||busy)return;
  const id=channelId,content=draft.trim();
  setBusy(true);setError("");
  try{
   await apiV3("/api/v3/call-messages","POST",{channelId:id,content});
   if(currentChannel.current!==id)return;
   setDraft("");follow.current=true;
   const result=await apiV3<CallPage>("/api/v3/call-messages?channelId="+encodeURIComponent(id));
   if(currentChannel.current===id)setMessages(previous=>mergeCall(previous,result.messages));
  }catch(e){if(currentChannel.current===id)setError(updateError(e));}
  finally{setBusy(false);}
 }
 return <aside className="v3-call-chat" aria-label="Chat da chamada">
  <header><MessageCircle size={17}/><strong>Chat da chamada</strong><button aria-label="Fechar chat da chamada" title="Fechar" onClick={onClose}><X size={17}/></button></header>
  <div className="v3-call-chat-messages" ref={scroll} onScroll={()=>{if(scroll.current)follow.current=scroll.current.scrollHeight-scroll.current.scrollTop-scroll.current.clientHeight<90}}>
   {olderCursor&&<button type="button" className="v3-load-history" disabled={olderLoading} onClick={()=>void loadOlder()}>{olderLoading?"Carregando histórico…":"Carregar mensagens anteriores"}</button>}
   {messages.length===0&&<p className="v3-muted">Esse chat é separado das conversas do servidor.</p>}
   {messages.map(m=><div key={m.id} className="v3-call-msg">
    <Avatar name={m.name} src={m.avatar_data_url} badge={m.badge} size={29}/>
    <div><strong>{m.name}</strong><p>{m.content}</p></div>
   </div>)}
  </div>
  {error&&<p className="v3-error" role="alert">{error}</p>}
  <form onSubmit={e=>void send(e)} className="v3-call-chat-compose">
   <textarea aria-label="Mensagem no chat da chamada" placeholder="Mensagem na chamada…" maxLength={2000} rows={2} value={draft} onChange={e=>setDraft(e.target.value)}
    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/>
   <button type="submit" title="Enviar" disabled={busy||!draft.trim()}><Send size={17}/></button>
  </form>
 </aside>;
}
