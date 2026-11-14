"use client";
import { ArrowRight, Copy, Hash, Headphones, Menu, Plus, UserRound, Users } from "lucide-react";
import { Avatar, Badge } from "./ui-kit";
import { InstallLumaCall } from "./install-app";
type ServerEntry={id:string;name:string};
type MemberEntry={id:string;name:string;badge:string|null;avatar_data_url:string|null;role:string};
export function ServerRail({servers,selected,onSelect,onCreate,onJoin}:{
  servers:ServerEntry[];selected:string|null;
  onSelect:(id:string)=>void;onCreate:()=>void;onJoin:()=>void;
}){
  return <nav className="v2-servers-rail" aria-label="Seus servidores">
    <div className="v2-rail-brand"><img src="/icons/lumacall-obsidian-mark.svg" alt="LumaCall" width="43" height="43"/></div>
    <div className="v2-rail-divider" aria-hidden="true"/>
    {servers.map(s=><button key={s.id} type="button" onClick={()=>onSelect(s.id)} title={s.name} aria-label={"Abrir servidor "+s.name} aria-current={selected===s.id?"page":undefined} className={"v2-server-icon "+(selected===s.id?"selected":"")}><span aria-hidden="true">{s.name.slice(0,2).toUpperCase()}</span></button>)}
    <button type="button" className="v2-add-server" title="Criar servidor" aria-label="Criar servidor" onClick={onCreate}><Plus size={24}/></button>
    <button type="button" className="v2-add-server" title="Entrar com convite" aria-label="Entrar em servidor" onClick={onJoin}><ArrowRight size={20}/></button>
  </nav>;
}
export function MembersPanel({members}:{members:MemberEntry[]}){
  return <aside className="v2-members" aria-label="Membros do servidor">
    <h3><Users size={15}/> MEMBROS — {members.length}/6</h3>
    {members.map(m=><div className="v2-member" key={m.id}>
      <Avatar name={m.name} src={m.avatar_data_url} badge={m.badge} size={35}/>
      <div><strong>{m.name}</strong>{m.badge?<Badge badge={m.badge}/>:<small>{m.role==="owner"?"Dono do servidor":"Membro"}</small>}</div>
    </div>)}
  </aside>;
}
export function AppTopbar({view,serverName,hasServer,sidebarOpen,lastCopied,onToggleSidebar,onCopyInvite,onProfile}:{
  view:"text"|"voice";serverName:string;hasServer:boolean;sidebarOpen:boolean;lastCopied:boolean;
  onToggleSidebar:()=>void;onCopyInvite:()=>void;onProfile:()=>void;
}){
  return <header className="v2-topbar">
    <button type="button" className="v2-mobile-menu" aria-label="Canais" aria-controls="lc-sidebar" aria-expanded={sidebarOpen} onClick={onToggleSidebar}><Menu size={22}/></button>
    {view==="text"?<Hash size={21}/>:<Headphones size={21}/>}
    <strong>{view==="text"?"geral":"Chamada de voz"}</strong>
    <span className="v2-top-desc">{serverName}</span>
    <div className="v2-top-actions">
      <InstallLumaCall compact/>
      {hasServer&&<button type="button" onClick={onCopyInvite} title="Copiar convite"><Copy size={18}/><span>{lastCopied?"Copiado!":"Convite"}</span></button>}
      <button type="button" title="Perfil" aria-label="Abrir perfil" onClick={onProfile}><UserRound size={19}/></button>
    </div>
  </header>;
}
