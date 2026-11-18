"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MessageCircle, Send, X } from "lucide-react";
import { Avatar } from "../v2/ui-kit";
import { apiV3, updateError } from "./client";

type Thread={id:string;peer_id:string;name:string;avatar_data_url:string|null;last_message:string|null;presence:string};
type DMMessage={id:string;user_id:string;name:string;avatar_data_url:string|null;content:string;created_at:string;edited_at?:string|null};
type DMPage={messages:DMMessage[];nextCursor:string|null};
function mergeDM(previous:DMMessage[],incoming:DMMessage[]):DMMessage[]{
 const byId=new Map(previous.map(m=>[m.id,m] as const));
 for(const m of incoming)byId.set(m.id,m);
 return [...byId.values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:BigInt(a.id)>BigInt(b.id)?1:0);
}

export function DMPanel({userId,initialPeerId,onClose}:{userId:string;initialPeerId:string|null;onClose:()=>void}){
 const [threads,setThreads]=useState<Thread[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [messages,setMessages]=useState<DMMessage[]>([]);
 const [olderCursor,setOlderCursor]=useState<string|null>(null);
 const [olderLoading,setOlderLoading]=useState(false);
 const [draft,setDraft]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const scroll=useRef<HTMLDivElement>(null);
 const followed=useRef(true);
 const requestRef=useRef(0);
 const selectedRef=useRef<string|null>(null);
 const historyInitialized=useRef(false);
 const restoreScroll=useRef<{height:number;top:number}|null>(null);
 const loadThreads=useCallback(async()=>{
  const x=await apiV3<{threads:Thread[]}>("/api/v3/dm");
  setThreads(x.threads);return x.threads;
 },[]);
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const list=await loadThreads();
    if(initialPeerId&&initialPeerId!==userId){
     const result=await apiV3<{threadId:string}>("/api/v3/dm","POST",{action:"open",peerId:initialPeerId});
     await loadThreads();
     if(active)setSelected(result.threadId);
    }else if(active&&list.length)setSelected(list[0].id);
   }catch(e){if(active)setError(updateError(e));}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[initialPeerId,userId,loadThreads]);
 useEffect(()=>{
  selectedRef.current=selected;
  followed.current=true;
  setMessages([]);setOlderCursor(null);setOlderLoading(false);
  historyInitialized.current=false;restoreScroll.current=null;
  requestRef.current++;
  if(!selected)return;
  const id=selected;
  const update=async()=>{
   const n=++requestRef.current;
   try{
    const result=await apiV3<DMPage>("/api/v3/dm?threadId="+encodeURIComponent(id));
    if(selectedRef.current===id&&requestRef.current===n){
     setMessages(previous=>mergeDM(previous,result.messages));
     if(!historyInitialized.current){historyInitialized.current=true;setOlderCursor(result.nextCursor);}
    }
   }catch(e){if(selectedRef.current===id&&requestRef.current===n)setError(updateError(e));}
  };
  void update();
  const interval=window.setInterval(()=>void update(),3500);
  return()=>{clearInterval(interval);requestRef.current++;};
 },[selected]);
 useEffect(()=>{
  if(followed.current&&scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;
 },[messages[messages.length-1]?.id,selected]);
 async function send(e:FormEvent){
  e.preventDefault();if(!selected||!draft.trim()||busy)return;
  setBusy(true);setError("");
  try{
   await apiV3("/api/v3/dm","POST",{threadId:selected,content:draft.trim()});
   setDraft("");followed.current=true;
   const result=await apiV3<DMPage>("/api/v3/dm?threadId="+encodeURIComponent(selected));
   setMessages(previous=>mergeDM(previous,result.messages));void loadThreads();
  }catch(e){setError(updateError(e));}finally{setBusy(false);}
 }
 async function loadOlder(){
  if(!selected||!olderCursor||olderLoading)return;
  const id=selected,cursor=olderCursor;
  const el=scroll.current;
  const previousPosition={height:el?.scrollHeight||0,top:el?.scrollTop||0};
  setOlderLoading(true);followed.current=false;
  try{
   const data=await apiV3<DMPage>("/api/v3/dm?threadId="+encodeURIComponent(id)+"&before="+encodeURIComponent(cursor));
   if(selectedRef.current!==id)return;
   restoreScroll.current=previousPosition;
   setMessages(previous=>mergeDM(previous,data.messages));
   setOlderCursor(data.nextCursor);
  }catch(e){if(selectedRef.current===id)setError(updateError(e));}
  finally{if(selectedRef.current===id)setOlderLoading(false);}
 }
 useEffect(()=>{
  const el=scroll.current,saved=restoreScroll.current;
  if(el&&saved){el.scrollTop=saved.top+el.scrollHeight-saved.height;restoreScroll.current=null;}
 },[messages]);
 const active=threads.find(t=>t.id===selected);
 return <div className="v3-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section className="v3-dm-dialog" role="dialog" aria-modal="true" aria-label="Mensagens privadas">
   <aside className="v3-dm-sidebar">
    <header><MessageCircle size={18}/><strong>Mensagens privadas</strong></header>
    {loading&&<p className="v3-muted">Carregando…</p>}
    {threads.length===0&&!loading&&<p className="v3-muted">Ainda não há conversas. Selecione Mensagem no perfil de alguém de um servidor.</p>}
    {threads.map(t=><button key={t.id} type="button" className={"v3-dm-thread"+(t.id===selected?" selected":"")} onClick={()=>setSelected(t.id)}>
     <Avatar name={t.name} src={t.avatar_data_url} size={34}/>
     <span><strong>{t.name}</strong><small>{t.last_message||"Nova conversa"}</small></span>
    </button>)}
   </aside>
   <div className="v3-dm-content">
    <header className="v3-dm-top">
     <button type="button" title="Voltar às conversas" className="v3-dm-back" onClick={()=>setSelected(null)}><ArrowLeft size={17}/></button>
     <strong>{active?.name||"Mensagens privadas"}</strong>
     <button type="button" className="v3-icon-btn" aria-label="Fechar mensagens privadas" onClick={onClose}><X size={19}/></button>
    </header>
    {error&&<p role="alert" className="v3-error">{error}</p>}
    <div className="v3-dm-scroll" ref={scroll} onScroll={()=>{if(scroll.current)followed.current=scroll.current.scrollHeight-scroll.current.scrollTop-scroll.current.clientHeight<90;}}>
     {selected&&olderCursor&&<button type="button" className="v3-load-history" disabled={olderLoading} onClick={()=>void loadOlder()}>{olderLoading?"Carregando histórico…":"Carregar mensagens anteriores"}</button>}
     {selected&&messages.length===0&&<p className="v3-muted">Comece sua conversa. As mensagens são privadas entre vocês dois.</p>}
     {messages.map(m=><div className={"v3-dm-message"+(m.user_id===userId?" mine":"")} key={m.id}>
      <Avatar name={m.name} src={m.avatar_data_url} size={30}/>
      <div><span>{m.name} · {new Date(m.created_at).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
       <p>{m.content}</p></div>
     </div>)}
    </div>
    <form className="v3-dm-compose" onSubmit={e=>void send(e)}>
     <textarea aria-label="Mensagem privada" disabled={!selected} placeholder={active?"Mensagem para "+active.name:"Selecione uma conversa"} maxLength={2000} rows={2} value={draft} onChange={e=>setDraft(e.target.value)}
      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>
     <button type="submit" disabled={!selected||!draft.trim()||busy} title="Enviar"><Send size={18}/></button>
    </form>
   </div>
  </section>
 </div>;
}
