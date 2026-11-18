"use client";
import { ArrowRight, Copy, Hash, Headphones, Menu, Plus, UserRound, Users, Settings2, MessageCircle, MessagesSquare } from "lucide-react";
import { Avatar, Badge } from "./ui-kit";
import { InstallLumaCall } from "./install-app";
type ServerEntry={id:string;name:string;icon_data_url?:string|null};
type MemberEntry={id:string;name:string;badge:string|null;avatar_data_url:string|null;role:string;presence?:string;bio?:string};
export function ServerRail({servers,selected,onSelect,onCreate,onJoin}:{
  servers:ServerEntry[];selected:string|null;
  onSelect:(id:string)=>void;onCreate:()=>void;onJoin:()=>void;
}){
  return <nav className="v2-servers-rail" aria-label="Seus servidores">
    <div className="v2-rail-brand"><img src="/icons/lumacall-obsidian-mark.svg" alt="LumaCall" width="43" height="43"/></div>
    <div className="v2-rail-divider" aria-hidden="true"/>
    {servers.map(s=><button key={s.id} type="button" onClick={()=>onSelect(s.id)} title={s.name} aria-label={"Abrir servidor "+s.name} aria-current={selected===s.id?"page":undefined} className={"v2-server-icon "+(selected===s.id?"selected":"")}>{s.icon_data_url?<img src={s.icon_data_url} alt="" className="v3-server-icon-image"/>:<span aria-hidden="true">{s.name.slice(0,2).toUpperCase()}</span>}</button>)}
    <button type="button" className="v2-add-server" title="Criar servidor" aria-label="Criar servidor" onClick={onCreate}><Plus size={24}/></button>
    <button type="button" className="v2-add-server" title="Entrar com convite" aria-label="Entrar em servidor" onClick={onJoin}><ArrowRight size={20}/></button>
  </nav>;
}
export function MembersPanel({members,currentUserId,onMessage,onManage}:{members:MemberEntry[];currentUserId:string;onMessage:(id:string)=>void;onManage:()=>void}){
  return <aside className="v2-members" aria-label="Membros do servidor">
    <div className="v2-members-heading"><h3><Users size={15}/> MEMBROS — {members.length}/6</h3><button type="button" onClick={onManage} title="Abrir lista de membros" aria-label="Abrir lista e gestão de membros"><Settings2 size={14}/><span>Gerenciar</span></button></div>
    {members.map(m=><div className="v2-member" key={m.id}>
      <Avatar name={m.name} src={m.avatar_data_url} badge={m.badge} size={35}/>
      <div><strong>{m.name}</strong>{m.badge?<Badge badge={m.badge}/>:<small>{m.role==="owner"?"Dono do servidor":"Membro"}</small>}</div>
      {m.id!==currentUserId&&<button type="button" className="v3-member-chat-button" title={"Mensagem privada para "+m.name} aria-label={"Mensagem privada para "+m.name} onClick={()=>onMessage(m.id)}><MessageCircle size={16}/></button>}
    </div>)}
  </aside>;
}
export function AppTopbar({view,channelName,serverName,hasServer,sidebarOpen,lastCopied,callActive,onToggleSidebar,onCopyInvite,onProfile,onSettings,onMembers,onMessages,onToggleCallChat}:{
  view:"text"|"voice";channelName:string;serverName:string;hasServer:boolean;sidebarOpen:boolean;lastCopied:boolean;callActive:boolean;
  onToggleSidebar:()=>void;onCopyInvite:()=>void;onProfile:()=>void;onSettings:()=>void;onMembers:()=>void;onMessages:()=>void;onToggleCallChat:()=>void;
}){
  return <header className="v2-topbar">
    <button type="button" className="v2-mobile-menu" aria-label="Canais" aria-controls="lc-sidebar" aria-expanded={sidebarOpen} onClick={onToggleSidebar}><Menu size={22}/></button>
    {view==="text"?<Hash size={21}/>:<Headphones size={21}/>}
    <strong title={channelName}>{channelName}</strong>
    <span className="v2-top-desc">{serverName}</span>
    <div className="v2-top-actions">
      <InstallLumaCall compact/>
      <button type="button" onClick={onMessages} title="Mensagens privadas" aria-label="Mensagens privadas"><MessageCircle size={18}/></button>
      {hasServer&&<button type="button" onClick={onMembers} title="Membros e moderação" aria-label="Abrir membros e moderação"><Users size={18}/><span>Membros</span></button>}
      {hasServer&&<button type="button" onClick={onSettings} title="Configurações do servidor" aria-label="Configurações do servidor"><Settings2 size={18}/></button>}
      {view==="voice"&&callActive&&<button type="button" onClick={onToggleCallChat} title="Chat da chamada" aria-label="Chat da chamada"><MessagesSquare size={18}/></button>}
      {hasServer&&<button type="button" onClick={onCopyInvite} title="Copiar convite"><Copy size={18}/><span>{lastCopied?"Copiado!":"Convite"}</span></button>}
      <button type="button" title="Perfil" aria-label="Abrir perfil" onClick={onProfile}><UserRound size={19}/></button>
    </div>
  </header>;
}
