"use client";
import { Avatar, Badge, Brand, badgeNames } from "./ui-kit";
import { ServerRail, MembersPanel, AppTopbar } from "./shell-parts";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Hash, Headphones, Plus, Settings2, LogOut, UserRound, Camera, Check, Copy, Send, Users, ArrowRight, ShieldCheck, X, Mic, PhoneOff, Menu, ChevronDown, Server as ServerIcon, ImagePlus } from "lucide-react";
import { VoiceRoom } from "./voice";
import { InstallLumaCall } from "./install-app";
import { CommunityPanel } from "../v3/community-panel";
import { DMPanel } from "../v3/dm-panel";
import { CallChatPanel } from "../v3/call-chat-panel";
import { apiV3, updateError, type Channel, type Reaction } from "../v3/client";
import { Edit3, Trash2, SmilePlus, Lock, MessageCircle } from "lucide-react";

type User={id:string;name:string;name_key:string;avatar_data_url:string|null;badge:string|null;bio:string;presence:string};
type Server={id:string;name:string;icon_data_url:string|null;invite_code:string;member_count:number;role:string};
type Member={id:string;name:string;badge:string|null;avatar_data_url:string|null;role:string;bio?:string;presence?:string};
type Message={id:string;user_id:string;name:string;badge:string|null;avatar_data_url:string|null;content:string;created_at:string;edited_at?:string|null;deleted_at?:string|null};
type Modal="create"|"join"|"profile"|null;
type Voice={token:string;serverUrl:string;serverId:string;channelId:string};
async function api<T>(url:string,method="GET",data?:unknown):Promise<T>{
  const res=await fetch(url,{method,headers:data===undefined?undefined:{"content-type":"application/json"},body:data===undefined?undefined:JSON.stringify(data),credentials:"same-origin",cache:"no-store"});
  const json=await res.json().catch(()=>({error:"O servidor não respondeu."}));
  if(!res.ok)throw Error(json.error||"Operação indisponível.");
  return json as T;
}
export function NovaApp(){
  const [user,setUser]=useState<User|null>(null);
  const [servers,setServers]=useState<Server[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [members,setMembers]=useState<Member[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const [loading,setLoading]=useState(true);
  const [setupError,setSetupError]=useState(false);
  const [error,setError]=useState("");
  const [modal,setModal]=useState<Modal>(null);
  const [view,setView]=useState<"text"|"voice">("text");
  const [authMode,setAuthMode]=useState<"register"|"login">("register");
  const [name,setName]=useState("");
  const [secret,setSecret]=useState("");
  const [newServer,setNewServer]=useState("");
  const [invite,setInvite]=useState("");
  const [newName,setNewName]=useState("");
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [voice,setVoice]=useState<Voice|null>(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [lastCopied,setLastCopied]=useState(false);
  const [channels,setChannels]=useState<Channel[]>([]);
  const [textChannelId,setTextChannelId]=useState<string|null>(null);
  const [voiceChannelId,setVoiceChannelId]=useState<string|null>(null);
  const [canManageChannels,setCanManageChannels]=useState(false);
  const [showCommunity,setShowCommunity]=useState(false);
  const [dmOpen,setDmOpen]=useState(false);
  const [dmPeer,setDmPeer]=useState<string|null>(null);
  const [callChatOpen,setCallChatOpen]=useState(false);
  const [reactions,setReactions]=useState<Reaction[]>([]);
  const [editingMessage,setEditingMessage]=useState<string|null>(null);
  const [editMessageText,setEditMessageText]=useState("");
  const [reactionMenu,setReactionMenu]=useState<string|null>(null);
  const [bioDraft,setBioDraft]=useState("");
  const [presenceDraft,setPresenceDraft]=useState("online");
  const [currentSecret,setCurrentSecret]=useState("");
  const [nextSecret,setNextSecret]=useState("");
  const [profileNotice,setProfileNotice]=useState("");
  const messageScrollRef=useRef<HTMLDivElement>(null);
  const followMessagesRef=useRef(true);
  const activeServerRef=useRef<string|null>(null);
  const activeChannelRef=useRef<string|null>(null);
  const contentRequestRef=useRef(0);
  const selectedServer=servers.find(s=>s.id===selected);
  const selectedTextChannel=channels.find(c=>c.id===textChannelId&&c.kind==="text");
  const selectedVoiceChannel=channels.find(c=>c.id===voiceChannelId&&c.kind==="voice");
  async function boot(){try{const x=await api<{user:User|null}>("/api/v2/auth");setUser(x.user);}catch{setSetupError(true);}finally{setLoading(false);}}
  useEffect(()=>{void boot();},[]);
  async function loadServers(){
    try{const res=await api<{servers:Server[]}>("/api/v2/servers");setServers(res.servers);setSelected(cur=>cur&&res.servers.some(s=>s.id===cur)?cur:(res.servers[0]?.id||null));}
    catch(e){setError((e as Error).message);}
  }
  useEffect(()=>{if(user)void loadServers();else{setServers([]);setSelected(null)}},[user?.id]);
  async function loadChannels(serverId:string){
    try{
      const data=await apiV3<{channels:Channel[];canManage:boolean}>("/api/v3/channels?serverId="+encodeURIComponent(serverId));
      if(activeServerRef.current!==serverId)return;
      setChannels(data.channels);setCanManageChannels(data.canManage);
      setTextChannelId(current=>data.channels.some(c=>c.id===current&&c.kind==="text")?current:data.channels.find(c=>c.kind==="text")?.id||null);
      setVoiceChannelId(current=>data.channels.some(c=>c.id===current&&c.kind==="voice")?current:data.channels.find(c=>c.kind==="voice")?.id||null);
    }catch(e){if(activeServerRef.current===serverId)setError(updateError(e));}
  }
  async function loadContent(serverId:string,channelId:string){
    const requestId=++contentRequestRef.current;
    try{
      const [membersData,chatData]=await Promise.all([
        api<{members:Member[]}>("/api/v2/members?serverId="+encodeURIComponent(serverId)),
        apiV3<{messages:Message[];reactions:Reaction[]}>("/api/v3/messages?channelId="+encodeURIComponent(channelId))
      ]);
      if(activeServerRef.current!==serverId||activeChannelRef.current!==channelId||requestId!==contentRequestRef.current)return;
      setMembers(membersData.members);setMessages(chatData.messages);setReactions(chatData.reactions);
    }catch(e){
      if(activeServerRef.current===serverId&&activeChannelRef.current===channelId&&requestId===contentRequestRef.current)setError(updateError(e));
    }
  }
  useEffect(()=>{
    activeServerRef.current=selected;
    activeChannelRef.current=null;contentRequestRef.current++;followMessagesRef.current=true;
    setChannels([]);setTextChannelId(null);setVoiceChannelId(null);setMembers([]);setMessages([]);setReactions([]);
    if(selected)void loadChannels(selected);
  },[selected]);
  useEffect(()=>{
    activeChannelRef.current=textChannelId;
    contentRequestRef.current++;followMessagesRef.current=true;
    setMessages([]);setReactions([]);
    if(!selected||!textChannelId)return;
    void loadContent(selected,textChannelId);
    const timer=window.setInterval(()=>void loadContent(selected,textChannelId),4500);
    return()=>{window.clearInterval(timer);contentRequestRef.current++;};
  },[selected,textChannelId]);
  useEffect(()=>{
    if(view!=="text"||!followMessagesRef.current)return;
    const scroll=messageScrollRef.current;
    if(scroll)scroll.scrollTop=scroll.scrollHeight;
  },[messages[messages.length-1]?.id,view,selected]);
  function observeChatScroll(){
    const node=messageScrollRef.current;
    if(node)followMessagesRef.current=node.scrollHeight-node.scrollTop-node.clientHeight<=100;
  }
  async function submitAuth(e:FormEvent){e.preventDefault();setBusy(true);setError("");
    try{await api("/api/v2/auth","POST",{action:authMode,name,secret});setSecret("");await boot();}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function logout(){try{await api("/api/v2/auth","DELETE");setVoice(null);setUser(null);setName("");setSecret("");setView("text");setModal(null);}catch(e){setError((e as Error).message);}}
  function chooseServer(id:string){
    if(id===selected){setView("text");setSidebarOpen(false);return;}
    activeServerRef.current=id;
    contentRequestRef.current++;
    followMessagesRef.current=true;
    setSelected(id);setView("text");setSidebarOpen(false);setVoice(null);setCallChatOpen(false);setMessages([]);
  }
  async function createServer(e:FormEvent){e.preventDefault();setBusy(true);setError("");
    try{const out=await api<{id:string}>("/api/v2/servers","POST",{name:newServer});setModal(null);setNewServer("");await loadServers();setSelected(out.id);}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function joinServer(e:FormEvent){e.preventDefault();setBusy(true);setError("");
    try{const out=await api<{id:string}>("/api/v2/servers/join","POST",{code:invite});setModal(null);setInvite("");await loadServers();chooseServer(out.id);}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function send(e:FormEvent){e.preventDefault();if(!selected||!draft.trim()||busy)return;const text=draft.trim();setBusy(true);setError("");
    if(!textChannelId)return;
    try{await apiV3("/api/v3/messages","POST",{channelId:textChannelId,content:text});setDraft("");followMessagesRef.current=true;await loadContent(selected,textChannelId);}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function joinVoice(){if(!selected||!voiceChannelId||busy)return;setBusy(true);setError("");
    try{const out=await api<{token:string;serverUrl:string}>("/api/v3/voice","POST",{channelId:voiceChannelId});setVoice({serverId:selected,channelId:voiceChannelId,token:out.token,serverUrl:out.serverUrl});setView("voice");}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function updateProfile(e:FormEvent){e.preventDefault();setBusy(true);setError("");
    try{const out=await api<{user:User}>("/api/v2/profile","PATCH",{name:newName,bio:bioDraft,presence:presenceDraft});setUser(out.user);setModal(null);setProfileNotice("");}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function updatePhoto(file?:File){if(!file)return;if(!file.type.startsWith("image/")){setError("Escolha uma imagem.");return;}
    setBusy(true);setError("");
    try{
      const bitmap=await createImageBitmap(file);
      const size=256,canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext("2d");if(!ctx)throw Error("Não foi possível processar a foto.");
      const scale=Math.max(size/bitmap.width,size/bitmap.height);
      ctx.drawImage(bitmap,(size-bitmap.width*scale)/2,(size-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);
      bitmap.close();
      const url=canvas.toDataURL("image/webp",0.78);
      if(url.length>160000)throw Error("Imagem muito grande. Escolha uma foto mais simples.");
      const result=await api<{user:User}>("/api/v2/profile","PATCH",{avatar:url});
      setUser(result.user);if(selected&&textChannelId)void loadContent(selected,textChannelId);
    }catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  function openDM(peerId:string|null){setDmPeer(peerId);setDmOpen(true);}
  function openProfile(){setNewName(user?.name||"");setBioDraft(user?.bio||"");setPresenceDraft(user?.presence||"online");setProfileNotice("");setError("");setModal("profile");}
  async function updateMessage(e:FormEvent){
    e.preventDefault();if(!editingMessage||!editMessageText.trim()||!selected||!textChannelId)return;
    setBusy(true);setError("");
    try{await apiV3("/api/v3/messages","PATCH",{id:editingMessage,content:editMessageText});setEditingMessage(null);await loadContent(selected,textChannelId);}
    catch(e){setError(updateError(e));}finally{setBusy(false);}
  }
  async function deleteMessage(id:string){
    if(!selected||!textChannelId||!window.confirm("Excluir esta mensagem?"))return;
    try{await apiV3("/api/v3/messages","DELETE",{id});await loadContent(selected,textChannelId);}
    catch(e){setError(updateError(e));}
  }
  async function reactMessage(id:string,emoji:string){
    if(!selected||!textChannelId)return;
    try{await apiV3("/api/v3/messages","POST",{action:"reaction",messageId:id,emoji});setReactionMenu(null);await loadContent(selected,textChannelId);}
    catch(e){setError(updateError(e));}
  }
  async function changeSecret(e:FormEvent){
    e.preventDefault();if(!currentSecret||nextSecret.length<8)return;
    setBusy(true);setError("");setProfileNotice("");
    try{await apiV3("/api/v3/security","POST",{action:"change-secret",current:currentSecret,next:nextSecret});setProfileNotice("Código secreto alterado. Outras sessões foram encerradas.");setCurrentSecret("");setNextSecret("");}
    catch(e){setError(updateError(e));}finally{setBusy(false);}
  }
  async function copyInvite(){if(!selectedServer)return;try{await navigator.clipboard.writeText(selectedServer.invite_code);setLastCopied(true);window.setTimeout(()=>setLastCopied(false),1700);}catch{setError("Não foi possível copiar. O código é "+selectedServer.invite_code)}}
  if(loading)return <div className="v2-loading"><Brand/><p>Carregando a nova versão...</p></div>;
  if(setupError)return <main className="v2-auth-page"><section className="v2-auth-panel"><Brand/><h1>Nova versão em preparação</h1><p>Para salvar nomes exclusivos, fotos e servidores, o banco de dados precisa ser conectado. A versão atual do LumaCall continua funcionando normalmente.</p><a href="/" className="v2-primary v2-full">Voltar ao LumaCall</a></section></main>;
  if(!user)return <main className="v2-auth-page"><div className="v2-auth-visual"><div className="v2-auth-logo"><img src="/icons/lumacall-obsidian-mark.svg" width="76" height="76" alt=""/></div><p>SEU ESPAÇO, SUAS CONVERSAS.</p><h1>Entre. Converse.<br/>Fique à vontade.</h1><span>AllBlack • servidores privados • até 6 pessoas</span></div><section className="v2-auth-panel"><Brand/><h2>{authMode==="register"?"Criar sua conta":"Entrar na sua conta"}</h2><p>{authMode==="register"?"Escolha um nome único e um código secreto. É só isso.":"Use o mesmo nome e o código secreto cadastrado."}</p><form onSubmit={submitAuth} className="v2-form"><label>Nome de usuário<input required minLength={3} maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"/></label><label>Código secreto<input required type="password" minLength={4} maxLength={200} autoComplete={authMode==="register"?"new-password":"current-password"} value={secret} onChange={e=>setSecret(e.target.value)} placeholder="Mínimo de 4 caracteres"/></label>{error&&<div className="v2-error" role="alert">{error}</div>}<button className="v2-primary" disabled={busy} type="submit">{busy?"Aguarde...":authMode==="register"?"Criar conta":"Entrar"}<ArrowRight size={16}/></button></form><button className="v2-text-link" type="button" onClick={()=>{setAuthMode(authMode==="register"?"login":"register");setError("");}}>{authMode==="register"?"Já tem conta? Entrar":"Não tem conta? Criar uma"}</button><small>Guarde seu código secreto. Ainda não há recuperação automática sem email.</small><div className="v2-install-auth"><InstallLumaCall/></div></section></main>;
  return <div className="v2-shell">
    <ServerRail servers={servers} selected={selected} onSelect={chooseServer} onCreate={()=>{setError("");setModal("create")}} onJoin={()=>{setError("");setModal("join")}}/>
    {sidebarOpen&&<button className="v2-mobile-backdrop" type="button" aria-label="Fechar lista de canais" onClick={()=>setSidebarOpen(false)}/>}
    <aside id="lc-sidebar" className={"v2-sidebar "+(sidebarOpen?"v2-sidebar-open":"")}>
      <div className="v2-server-name"><strong>{selectedServer?.name||"Seus servidores"}</strong>{selectedServer&&<button type="button" className="v3-section-action" title="Configurações do servidor" aria-label="Configurações do servidor" onClick={()=>setShowCommunity(true)}><Settings2 size={17}/></button>}</div>
      <div className="v2-channel-scroll">
        {selectedServer?<>
          <div className="v2-channel-section v3-channel-heading">CANAIS DE TEXTO{canManageChannels&&<button type="button" className="v3-section-action" title="Gerenciar canais" onClick={()=>setShowCommunity(true)}><Plus size={15}/></button>}</div>
          {channels.filter(c=>c.kind==="text").map(c=><button key={c.id} type="button" className={"v2-channel "+(view==="text"&&c.id===textChannelId?"active":"")}
            onClick={()=>{activeChannelRef.current=c.id;setTextChannelId(c.id);setView("text");setSidebarOpen(false);setEditingMessage(null)}}>
            <Hash size={18}/><span>{c.name}</span>{c.is_private&&<Lock className="v3-channel-private" size={13}/>}
          </button>)}
          <div className="v2-channel-section v3-channel-heading">CANAIS DE VOZ{canManageChannels&&<button type="button" className="v3-section-action" title="Gerenciar canais de voz" onClick={()=>setShowCommunity(true)}><Plus size={15}/></button>}</div>
          {channels.filter(c=>c.kind==="voice").map(c=><button key={c.id} type="button" className={"v2-channel "+(view==="voice"&&c.id===voiceChannelId?"active":"")}
            onClick={()=>{setVoiceChannelId(c.id);setView("voice");setSidebarOpen(false);setCallChatOpen(false)}}>
            <Headphones size={18}/><span>{c.name}</span>{c.is_private&&<Lock className="v3-channel-private" size={13}/>}
          </button>)}
          {channels.length===0&&<p className="v3-channel-list-empty">Carregando canais…</p>}
        </>:<div className="v2-sidebar-empty"><ServerIcon size={26}/><p>Crie seu primeiro servidor ou entre pelo código de convite.</p></div>}
      </div>
      {voice&&<div className="v2-voice-mini"><span className="v2-online-dot"/><div><strong>Voz conectada</strong><small>{selectedServer?.name||"Chamada"}</small></div><button type="button" aria-label="Desligar" title="Desligar" onClick={()=>setVoice(null)}><PhoneOff size={17}/></button></div>}
      <div className="v2-userbar"><Avatar name={user.name} src={user.avatar_data_url} badge={user.badge} size={39}/>
        <div><strong>{user.name}</strong><small>{user.presence==="dnd"?"Não perturbe":user.presence==="idle"?"Ausente":user.presence==="invisible"?"Invisível":user.badge?badgeNames[user.badge]||"Perfil":"Disponível"}</small></div>
        <button type="button" aria-label="Mensagens privadas" title="Mensagens privadas" onClick={()=>openDM(null)}><MessageCircle size={18}/></button>
        <button type="button" aria-label="Editar perfil" title="Editar perfil" onClick={openProfile}><Settings2 size={20}/></button>
      </div>
    </aside>
    <div className="v2-main">
      <AppTopbar view={view} channelName={view==="text"?(selectedTextChannel?.name||"geral"):(selectedVoiceChannel?.name||"Voz")}
        serverName={selectedServer?.name||"Bem-vindo ao LumaCall"} hasServer={Boolean(selectedServer)} sidebarOpen={sidebarOpen}
        lastCopied={lastCopied} callActive={Boolean(voice&&voice.serverId===selected&&voice.channelId===voiceChannelId)}
        onToggleSidebar={()=>setSidebarOpen(!sidebarOpen)} onCopyInvite={()=>void copyInvite()} onProfile={openProfile}
        onSettings={()=>setShowCommunity(true)} onMessages={()=>openDM(null)} onToggleCallChat={()=>setCallChatOpen(v=>!v)}/>
      {error&&<div className="v2-banner" role="alert">{error}<button type="button" onClick={()=>setError("")}><X size={16}/></button></div>}
      {!selectedServer?<div className="v2-first-server"><div className="v2-first-icon"><ServerIcon size={37}/></div><h1>Um lugar só seu.</h1><p>Crie um servidor para conversar por texto, áudio ou vídeo com até seis pessoas.</p><button type="button" className="v2-primary" onClick={()=>setModal("create")}><Plus size={18}/> Criar servidor</button><button type="button" className="v2-secondary" onClick={()=>setModal("join")}>Entrar com convite</button></div>:
      <div className="v2-main-layout">
        <div className="v2-central">
          <section className={view==="text"?"v2-chat":"v2-chat v2-is-hidden"}>
            <div className="v2-message-scroll" ref={messageScrollRef} onScroll={observeChatScroll}>
              {messages.length===0&&<div className="v2-chat-welcome"><div><Hash size={35}/></div><h2>Bem-vindo ao #{selectedTextChannel?.name||"geral"}</h2><p>Este é o início das conversas em {selectedServer.name}.</p></div>}
              {messages.map(m=><article key={m.id} className="v2-message">
                <Avatar name={m.name} src={m.avatar_data_url} badge={m.badge} size={42}/>
                <div className="v2-message-content">
                  <div className="v2-message-meta">
                    <strong>{m.name}</strong><Badge badge={m.badge}/>
                    <time>{new Date(m.created_at).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}{m.edited_at?" · editada":""}</time>
                    {!m.deleted_at&&<div className="v3-message-actions">
                      <button type="button" title="Reagir" aria-label="Reagir à mensagem" onClick={()=>setReactionMenu(reactionMenu===m.id?null:m.id)}><SmilePlus size={14}/></button>
                      {m.user_id===user.id&&<button type="button" title="Editar" aria-label="Editar mensagem" onClick={()=>{setEditingMessage(m.id);setEditMessageText(m.content)}}><Edit3 size={14}/></button>}
                      {(m.user_id===user.id||selectedServer.role==="owner")&&<button type="button" title="Excluir" aria-label="Excluir mensagem" onClick={()=>void deleteMessage(m.id)}><Trash2 size={14}/></button>}
                    </div>}
                  </div>
                  {editingMessage===m.id?<form className="v3-edit-form" onSubmit={e=>void updateMessage(e)}>
                    <textarea aria-label="Editar mensagem" maxLength={2000} required value={editMessageText} onChange={e=>setEditMessageText(e.target.value)}/>
                    <button type="submit" disabled={busy}>Salvar</button><button type="button" onClick={()=>setEditingMessage(null)}>Cancelar</button>
                  </form>:<p>{m.deleted_at?"Mensagem excluída":m.content}</p>}
                  {!m.deleted_at&&<>
                   {reactionMenu===m.id&&<div className="v3-message-reactions" aria-label="Escolher reação">
                     {["👍","❤️","😂","😮","😢","🔥","👀","🎉"].map(emoji=><button type="button" key={emoji} title={"Reagir com "+emoji} onClick={()=>void reactMessage(m.id,emoji)}>{emoji}</button>)}
                   </div>}
                   <div className="v3-message-reactions">
                    {[...new Set(reactions.filter(r=>r.message_id===m.id).map(r=>r.emoji))].map(emoji=>{
                     const grouped=reactions.filter(r=>r.message_id===m.id&&r.emoji===emoji);
                     return <button key={emoji} type="button" className={grouped.some(r=>r.user_id===user.id)?"mine":""} title={"Reagir com "+emoji}
                       onClick={()=>void reactMessage(m.id,emoji)}>{emoji} <span>{grouped.length}</span></button>;
                    })}
                   </div>
                  </>}
                </div>
              </article>)}

            </div>
            <form className="v2-composer" onSubmit={send}><textarea aria-label={"Mensagem no canal "+(selectedTextChannel?.name||"geral")} maxLength={2000} placeholder={"Conversar em #"+(selectedTextChannel?.name||"geral")} rows={2} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button type="submit" title="Enviar" aria-label="Enviar" disabled={!draft.trim()||busy||!textChannelId}><Send size={19}/></button></form>
          </section>
          {voice&&voice.serverId===selected&&voice.channelId===voiceChannelId&&<VoiceRoom token={voice.token} url={voice.serverUrl} members={members} onLeave={()=>{setVoice(null);setCallChatOpen(false)}} visible={view==="voice"}/>}
          {view==="voice"&&voice&&voice.serverId===selected&&voice.channelId===voiceChannelId&&callChatOpen&&<CallChatPanel serverId={selectedServer.id} onClose={()=>setCallChatOpen(false)}/>}

          {view==="voice"&&(!voice||voice.channelId!==voiceChannelId)&&<div className="v2-join-voice">
            <Headphones size={46}/><h2>{selectedVoiceChannel?.name||"Chamada de voz"}</h2>
            <p>Entre com o microfone e a câmera desligados. Ative quando quiser.</p>
            <button type="button" className="v2-primary" onClick={()=>void joinVoice()} disabled={busy||!voiceChannelId}><Mic size={18}/>{busy?"Conectando...":"Entrar na chamada"}</button>
          </div>}
        </div>
        <MembersPanel members={members} currentUserId={user.id} onMessage={id=>openDM(id)}/>
      </div>}
    </div>
    {showCommunity&&selected&&<CommunityPanel serverId={selected} serverName={selectedServer.name} serverIcon={selectedServer.icon_data_url} inviteCode={selectedServer.invite_code} isOwner={selectedServer.role==="owner"} members={members} onClose={()=>setShowCommunity(false)}
      onUpdated={()=>{void loadChannels(selected);if(textChannelId)void loadContent(selected,textChannelId)}}
      onOpenDm={id=>openDM(id)}/>}
    {dmOpen&&<DMPanel userId={user.id} initialPeerId={dmPeer} onClose={()=>{setDmOpen(false);setDmPeer(null)}}/>}
    {modal&&<div className="v2-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section role="dialog" aria-modal="true" aria-label={modal==="profile"?"Meu perfil":modal==="create"?"Criar servidor":"Entrar em servidor"} className="v2-dialog"><button type="button" className="v2-modal-close" aria-label="Fechar" onClick={()=>setModal(null)}><X size={19}/></button>{modal==="create"?<><h2>Criar seu servidor</h2><p>Seu espaço privado, com até 6 membros.</p><form className="v2-form" onSubmit={createServer}><label>Nome do servidor<input required minLength={3} maxLength={45} value={newServer} onChange={e=>setNewServer(e.target.value)} placeholder="Meu servidor"/></label><button className="v2-primary" disabled={busy} type="submit"><Plus size={16}/>Criar servidor</button></form></>:modal==="join"?<><h2>Entrar em um servidor</h2><p>Peça o código de convite ao dono.</p><form className="v2-form" onSubmit={joinServer}><label>Código de convite<input value={invite} onChange={e=>setInvite(e.target.value.toUpperCase())} placeholder="12 caracteres" maxLength={12} required/></label><button className="v2-primary" type="submit" disabled={busy}>Entrar no servidor</button></form></>:<><h2>Seu perfil</h2><p>Foto e nome ficam salvos na sua conta.</p><div className="v2-profile-avatar"><Avatar name={user.name} src={user.avatar_data_url} badge={user.badge} size={90}/><label className="v2-upload"><ImagePlus size={17}/> Mudar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void updatePhoto(e.target.files?.[0])} hidden/></label></div><form className="v2-form v3-profile-fields" onSubmit={updateProfile}>
  <label>Nome de usuário<input value={newName} onChange={e=>setNewName(e.target.value)} minLength={3} maxLength={24} required/></label>
  <label>Biografia<textarea value={bioDraft} maxLength={180} rows={3} placeholder="Fale um pouco sobre você" onChange={e=>setBioDraft(e.target.value)}/></label>
  <label>Meu status<select value={presenceDraft} onChange={e=>setPresenceDraft(e.target.value)}>
    <option value="online">Disponível</option><option value="idle">Ausente</option><option value="dnd">Não perturbe</option><option value="invisible">Invisível</option>
  </select></label>
  <Badge badge={user.badge}/>
  <button type="submit" disabled={busy} className="v2-primary"><Check size={16}/> Salvar perfil</button>
</form>
<form className="v2-form v3-profile-fields" onSubmit={changeSecret} style={{marginTop:20,paddingTop:16,borderTop:"1px solid #333"}}>
  <strong>Segurança da conta</strong>
  <label>Código secreto atual<input type="password" required autoComplete="current-password" value={currentSecret} onChange={e=>setCurrentSecret(e.target.value)}/></label>
  <label>Novo código secreto<input type="password" required autoComplete="new-password" minLength={8} value={nextSecret} onChange={e=>setNextSecret(e.target.value)} placeholder="Mínimo de 8 caracteres"/></label>
  <button type="submit" disabled={busy||!currentSecret||nextSecret.length<8} className="v2-secondary">Alterar código e encerrar outras sessões</button>
  {profileNotice&&<p role="status" style={{color:"#bde6c8",fontSize:11}}>{profileNotice}</p>}
</form><button type="button" className="v2-logout" onClick={()=>void logout()}><LogOut size={16}/> Sair da conta</button></>}{error&&<p className="v2-error" role="alert">{error}</p>}</section></div>}
  </div>;
}
