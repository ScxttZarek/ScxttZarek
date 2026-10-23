"use client";
import { reservedAvatarForBadge } from "@/lib/reserved-profile";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Hash, Headphones, Plus, Settings2, LogOut, UserRound, Camera, Check, Copy, Send, Users, ArrowRight, ShieldCheck, X, Mic, PhoneOff, Menu, ChevronDown, Server as ServerIcon, ImagePlus } from "lucide-react";
import { VoiceRoom } from "./voice";

type User={id:string;name:string;name_key:string;avatar_data_url:string|null;badge:string|null};
type Server={id:string;name:string;invite_code:string;member_count:number;role:string};
type Member={id:string;name:string;badge:string|null;avatar_data_url:string|null;role:string};
type Message={id:string;user_id:string;name:string;badge:string|null;avatar_data_url:string|null;content:string;created_at:string};
type Modal="create"|"join"|"profile"|null;
type Voice={token:string;serverUrl:string;serverId:string};
const badgeNames:Record<string,string>={creator:"CRIADOR",editor:"EDITOR",imperio_sohlar:"IMPÉRIO SOHLAR",princesa_tess:"PRINCESA TESS",bolacha_oreo:"BOLACHAOREO"};
async function api<T>(url:string,method="GET",data?:unknown):Promise<T>{
  const res=await fetch(url,{method,headers:data===undefined?undefined:{"content-type":"application/json"},body:data===undefined?undefined:JSON.stringify(data),credentials:"same-origin",cache:"no-store"});
  const json=await res.json().catch(()=>({error:"O servidor não respondeu."}));
  if(!res.ok)throw Error(json.error||"Operação indisponível.");
  return json as T;
}
function defaultReservedAvatar(badge?:string|null) {
  if(badge==="princesa_tess")return "/avatars/shine.webp";
  if(badge==="bolacha_oreo")return "/avatars/aldron.webp";
  return reservedAvatarForBadge(badge||undefined);
}
function Avatar({name,src,badge,size=38}:{name:string;src?:string|null;badge?:string|null;size?:number}){
  const image=src || defaultReservedAvatar(badge);
  return image?<img className="v2-avatar" src={image} alt="" style={{width:size,height:size}}/>:<span className="v2-avatar v2-avatar-fallback" style={{width:size,height:size,fontSize:size*.38}}>{name.slice(0,1).toUpperCase()}</span>;
}
function Badge({badge}:{badge?:string|null}){return badge&&badgeNames[badge]?<span className={"v2-badge v2-badge-"+badge}>{badgeNames[badge]}</span>:null;}
function Brand(){return <div className="v2-brand"><img src="/icons/lumacall-obsidian-mark.svg" alt="" width="33" height="33"/><strong>LumaCall</strong><span>2.0</span></div>}
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
  const bottomRef=useRef<HTMLDivElement>(null);
  const selectedServer=servers.find(s=>s.id===selected);
  async function boot(){try{const x=await api<{user:User|null}>("/api/v2/auth");setUser(x.user);}catch{setSetupError(true);}finally{setLoading(false);}}
  useEffect(()=>{void boot();},[]);
  async function loadServers(){
    try{const res=await api<{servers:Server[]}>("/api/v2/servers");setServers(res.servers);setSelected(cur=>cur&&res.servers.some(s=>s.id===cur)?cur:(res.servers[0]?.id||null));}
    catch(e){setError((e as Error).message);}
  }
  useEffect(()=>{if(user)void loadServers();else{setServers([]);setSelected(null)}},[user?.id]);
  async function loadContent(serverId:string) {
    const id=encodeURIComponent(serverId);
    try{
      const [a,b]=await Promise.all([api<{members:Member[]}>("/api/v2/members?serverId="+id),api<{messages:Message[]}>("/api/v2/messages?serverId="+id)]);
      setMembers(a.members);setMessages(b.messages);
    }catch(e){setError((e as Error).message);}
  }
  useEffect(()=>{if(!selected){setMembers([]);setMessages([]);return;}void loadContent(selected);const timer=window.setInterval(()=>void loadContent(selected),4500);return()=>window.clearInterval(timer)},[selected]);
  useEffect(()=>{if(view==="text")bottomRef.current?.scrollIntoView({block:"end"});},[messages.length,view,selected]);
  async function submitAuth(e:FormEvent){e.preventDefault();setBusy(true);setError("");
    try{await api("/api/v2/auth","POST",{action:authMode,name,secret});setSecret("");await boot();}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function logout(){try{await api("/api/v2/auth","DELETE");setVoice(null);setUser(null);setName("");setSecret("");setView("text");setModal(null);}catch(e){setError((e as Error).message);}}
  function chooseServer(id:string){setSelected(id);setView("text");setSidebarOpen(false);setVoice(null);setMessages([]);}
  async function createServer(e:FormEvent){e.preventDefault();setBusy(true);setError("");
    try{const out=await api<{id:string}>("/api/v2/servers","POST",{name:newServer});setModal(null);setNewServer("");await loadServers();setSelected(out.id);}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function joinServer(e:FormEvent){e.preventDefault();setBusy(true);setError("");
    try{const out=await api<{id:string}>("/api/v2/servers/join","POST",{code:invite});setModal(null);setInvite("");await loadServers();chooseServer(out.id);}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function send(e:FormEvent){e.preventDefault();if(!selected||!draft.trim()||busy)return;const text=draft.trim();setBusy(true);setError("");
    try{await api("/api/v2/messages","POST",{serverId:selected,content:text});setDraft("");await loadContent(selected);}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function joinVoice(){if(!selected||busy)return;setBusy(true);setError("");
    try{const out=await api<{token:string;serverUrl:string}>("/api/v2/voice","POST",{serverId:selected});setVoice({serverId:selected,token:out.token,serverUrl:out.serverUrl});setView("voice");}
    catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function updateProfile(e:FormEvent){e.preventDefault();setBusy(true);setError("");
    try{const out=await api<{user:User}>("/api/v2/profile","PATCH",{name:newName});setUser(out.user);setModal(null);}
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
      setUser(result.user);if(selected)void loadContent(selected);
    }catch(ex){setError((ex as Error).message);}finally{setBusy(false);}
  }
  async function copyInvite(){if(!selectedServer)return;try{await navigator.clipboard.writeText(selectedServer.invite_code);setLastCopied(true);window.setTimeout(()=>setLastCopied(false),1700);}catch{setError("Não foi possível copiar. O código é "+selectedServer.invite_code)}}
  if(loading)return <div className="v2-loading"><Brand/><p>Carregando a nova versão...</p></div>;
  if(setupError)return <main className="v2-auth-page"><section className="v2-auth-panel"><Brand/><h1>Nova versão em preparação</h1><p>Para salvar nomes exclusivos, fotos e servidores, o banco de dados precisa ser conectado. A versão atual do LumaCall continua funcionando normalmente.</p><a href="/" className="v2-primary v2-full">Voltar ao LumaCall</a></section></main>;
  if(!user)return <main className="v2-auth-page"><div className="v2-auth-visual"><div className="v2-auth-logo"><img src="/icons/lumacall-obsidian-mark.svg" width="76" height="76" alt=""/></div><p>SEU ESPAÇO, SUAS CONVERSAS.</p><h1>Entre. Converse.<br/>Fique à vontade.</h1><span>AllBlack • servidores privados • até 6 pessoas</span></div><section className="v2-auth-panel"><Brand/><h2>{authMode==="register"?"Criar sua conta":"Entrar na sua conta"}</h2><p>{authMode==="register"?"Escolha um nome único e um código secreto. É só isso.":"Use o mesmo nome e o código secreto cadastrado."}</p><form onSubmit={submitAuth} className="v2-form"><label>Nome de usuário<input required minLength={3} maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"/></label><label>Código secreto<input required type="password" minLength={4} maxLength={200} autoComplete={authMode==="register"?"new-password":"current-password"} value={secret} onChange={e=>setSecret(e.target.value)} placeholder="Mínimo de 4 caracteres"/></label>{error&&<div className="v2-error" role="alert">{error}</div>}<button className="v2-primary" disabled={busy} type="submit">{busy?"Aguarde...":authMode==="register"?"Criar conta":"Entrar"}<ArrowRight size={16}/></button></form><button className="v2-text-link" type="button" onClick={()=>{setAuthMode(authMode==="register"?"login":"register");setError("");}}>{authMode==="register"?"Já tem conta? Entrar":"Não tem conta? Criar uma"}</button><small>Guarde seu código secreto. Ainda não há recuperação automática sem email.</small></section></main>;
  return <div className="v2-shell">
    <nav className="v2-servers-rail" aria-label="Seus servidores">
      <div className="v2-rail-brand"><img src="/icons/lumacall-obsidian-mark.svg" alt="LumaCall" width="43" height="43"/></div>
      <div className="v2-rail-divider"/>
      {servers.map(s=><button key={s.id} type="button" onClick={()=>chooseServer(s.id)} title={s.name} className={"v2-server-icon "+(selected===s.id?"selected":"")}><span>{s.name.slice(0,2).toUpperCase()}</span></button>)}
      <button type="button" className="v2-add-server" title="Criar servidor" aria-label="Criar servidor" onClick={()=>{setError("");setModal("create")}}><Plus size={24}/></button>
      <button type="button" className="v2-add-server" title="Entrar com convite" aria-label="Entrar em servidor" onClick={()=>{setError("");setModal("join")}}><ArrowRight size={20}/></button>
    </nav>
    <aside className={"v2-sidebar "+(sidebarOpen?"v2-sidebar-open":"")}>
      <div className="v2-server-name"><strong>{selectedServer?.name||"Seus servidores"}</strong><ChevronDown size={17}/></div>
      <div className="v2-channel-scroll">
        {selectedServer?<><div className="v2-channel-section">CANAIS DE TEXTO</div><button type="button" className={"v2-channel "+(view==="text"?"active":"")} onClick={()=>{setView("text");setSidebarOpen(false)}}><Hash size={20}/><span>geral</span></button><div className="v2-channel-section">CANAIS DE VOZ</div><button type="button" className={"v2-channel "+(view==="voice"?"active":"")} onClick={()=>{setView("voice");setSidebarOpen(false)}}><Headphones size={19}/><span>Chamada de voz</span><span className="v2-channel-count">{selectedServer.member_count}/6</span></button></>:<div className="v2-sidebar-empty"><ServerIcon size={26}/><p>Crie seu primeiro servidor ou entre pelo código de convite.</p></div>}
      </div>
      {voice&&<div className="v2-voice-mini"><span className="v2-online-dot"/><div><strong>Voz conectada</strong><small>{selectedServer?.name||"Chamada"}</small></div><button type="button" aria-label="Desligar" title="Desligar" onClick={()=>setVoice(null)}><PhoneOff size={17}/></button></div>}
      <div className="v2-userbar"><Avatar name={user.name} src={user.avatar_data_url} badge={user.badge} size={39}/><div><strong>{user.name}</strong><small>{user.badge?badgeNames[user.badge]||"Perfil":"Minha conta"}</small></div><button type="button" aria-label="Editar perfil" title="Editar perfil" onClick={()=>{setNewName(user.name);setError("");setModal("profile")}}><Settings2 size={20}/></button></div>
    </aside>
    <div className="v2-main">
      <header className="v2-topbar"><button type="button" className="v2-mobile-menu" aria-label="Canais" onClick={()=>setSidebarOpen(!sidebarOpen)}><Menu size={22}/></button>{view==="text"?<Hash size={21}/>:<Headphones size={21}/>}<strong>{view==="text"?"geral":"Chamada de voz"}</strong><span className="v2-top-desc">{selectedServer?.name||"Bem-vindo ao LumaCall"}</span><div className="v2-top-actions">{selectedServer&&<button type="button" onClick={()=>void copyInvite()} title="Copiar convite"><Copy size={18}/><span>{lastCopied?"Copiado!":"Convite"}</span></button>}<button type="button" title="Perfil" onClick={()=>{setNewName(user.name);setModal("profile")}}><UserRound size={19}/></button></div></header>
      {error&&<div className="v2-banner" role="alert">{error}<button type="button" onClick={()=>setError("")}><X size={16}/></button></div>}
      {!selectedServer?<div className="v2-first-server"><div className="v2-first-icon"><ServerIcon size={37}/></div><h1>Um lugar só seu.</h1><p>Crie um servidor para conversar por texto, áudio ou vídeo com até seis pessoas.</p><button type="button" className="v2-primary" onClick={()=>setModal("create")}><Plus size={18}/> Criar servidor</button><button type="button" className="v2-secondary" onClick={()=>setModal("join")}>Entrar com convite</button></div>:
      <div className="v2-main-layout">
        <div className="v2-central">
          <section className={view==="text"?"v2-chat":"v2-chat v2-is-hidden"}>
            <div className="v2-message-scroll">
              {messages.length===0&&<div className="v2-chat-welcome"><div><Hash size={35}/></div><h2>Bem-vindo ao #geral</h2><p>Este é o início das conversas em {selectedServer.name}.</p></div>}
              {messages.map(m=><article key={m.id} className="v2-message"><Avatar name={m.name} src={m.avatar_data_url} badge={m.badge} size={42}/><div className="v2-message-content"><div className="v2-message-meta"><strong>{m.name}</strong><Badge badge={m.badge}/><time>{new Date(m.created_at).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</time></div><p>{m.content}</p></div></article>)}
              <div ref={bottomRef}/>
            </div>
            <form className="v2-composer" onSubmit={send}><textarea aria-label="Mensagem no geral" maxLength={2000} placeholder="Conversar em #geral" rows={2} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button type="submit" title="Enviar" aria-label="Enviar" disabled={!draft.trim()||busy}><Send size={19}/></button></form>
          </section>
          {voice&&voice.serverId===selected&&<VoiceRoom token={voice.token} url={voice.serverUrl} members={members} onLeave={()=>setVoice(null)} visible={view==="voice"}/>}
          {view==="voice"&&!voice&&<div className="v2-join-voice"><Headphones size={46}/><h2>Chamada de voz</h2><p>Entre com o microfone e a câmera desligados. Ative quando quiser.</p><button type="button" className="v2-primary" onClick={()=>void joinVoice()} disabled={busy}><Mic size={18}/>{busy?"Conectando...":"Entrar na chamada"}</button></div>}
        </div>
        <aside className="v2-members"><h3><Users size={15}/> MEMBROS — {members.length}/6</h3>{members.map(m=><div className="v2-member" key={m.id}><Avatar name={m.name} src={m.avatar_data_url} badge={m.badge} size={35}/><div><strong>{m.name}</strong>{m.badge?<Badge badge={m.badge}/>:<small>{m.role==="owner"?"Dono do servidor":"Membro"}</small>}</div></div>)}</aside>
      </div>}
    </div>
    {modal&&<div className="v2-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><section role="dialog" aria-modal="true" aria-label={modal==="profile"?"Meu perfil":modal==="create"?"Criar servidor":"Entrar em servidor"} className="v2-dialog"><button type="button" className="v2-modal-close" aria-label="Fechar" onClick={()=>setModal(null)}><X size={19}/></button>{modal==="create"?<><h2>Criar seu servidor</h2><p>Seu espaço privado, com até 6 membros.</p><form className="v2-form" onSubmit={createServer}><label>Nome do servidor<input required minLength={3} maxLength={45} value={newServer} onChange={e=>setNewServer(e.target.value)} placeholder="Meu servidor"/></label><button className="v2-primary" disabled={busy} type="submit"><Plus size={16}/>Criar servidor</button></form></>:modal==="join"?<><h2>Entrar em um servidor</h2><p>Peça o código de convite ao dono.</p><form className="v2-form" onSubmit={joinServer}><label>Código de convite<input value={invite} onChange={e=>setInvite(e.target.value.toUpperCase())} placeholder="12 caracteres" maxLength={12} required/></label><button className="v2-primary" type="submit" disabled={busy}>Entrar no servidor</button></form></>:<><h2>Seu perfil</h2><p>Foto e nome ficam salvos na sua conta.</p><div className="v2-profile-avatar"><Avatar name={user.name} src={user.avatar_data_url} badge={user.badge} size={90}/><label className="v2-upload"><ImagePlus size={17}/> Mudar foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void updatePhoto(e.target.files?.[0])} hidden/></label></div><form className="v2-form" onSubmit={updateProfile}><label>Nome de usuário<input value={newName} onChange={e=>setNewName(e.target.value)} minLength={3} maxLength={24} required/></label><Badge badge={user.badge}/><button type="submit" disabled={busy} className="v2-primary"><Check size={16}/>Salvar perfil</button></form><button type="button" className="v2-logout" onClick={()=>void logout()}><LogOut size={16}/> Sair da conta</button></>}{error&&<p className="v2-error" role="alert">{error}</p>}</section></div>}
  </div>;
}
