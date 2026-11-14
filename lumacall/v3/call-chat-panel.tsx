"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Avatar } from "../v2/ui-kit";
import { apiV3,updateError,type ChatMessage } from "./client";

export function CallChatPanel({serverId,onClose}:{serverId:string;onClose:()=>void}){
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const scroll=useRef<HTMLDivElement>(null);
 const follow=useRef(true);
 useEffect(()=>{
  let live=true;
  async function update(){
   try{const data=await apiV3<{messages:ChatMessage[]}>("/api/v3/call-messages?serverId="+encodeURIComponent(serverId));if(live)setMessages(data.messages);}
   catch(e){if(live)setError(updateError(e));}
  }
  void update();
  const timer=window.setInterval(()=>void update(),3500);
  return()=>{live=false;clearInterval(timer);};
 },[serverId]);
 useEffect(()=>{if(follow.current&&scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;},[messages[messages.length-1]?.id]);
 async function send(e:FormEvent){
  e.preventDefault();if(!draft.trim()||busy)return;
  setBusy(true);setError("");
  try{
   await apiV3("/api/v3/call-messages","POST",{serverId,content:draft.trim()});
   setDraft("");follow.current=true;
   const result=await apiV3<{messages:ChatMessage[]}>("/api/v3/call-messages?serverId="+encodeURIComponent(serverId));
   setMessages(result.messages);
  }catch(e){setError(updateError(e));}finally{setBusy(false);}
 }
 return <aside className="v3-call-chat" aria-label="Chat da chamada">
  <header><MessageCircle size={17}/><strong>Chat da chamada</strong><button aria-label="Fechar chat da chamada" title="Fechar" onClick={onClose}><X size={17}/></button></header>
  <div className="v3-call-chat-messages" ref={scroll} onScroll={()=>{if(scroll.current)follow.current=scroll.current.scrollHeight-scroll.current.scrollTop-scroll.current.clientHeight<90}}>
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
