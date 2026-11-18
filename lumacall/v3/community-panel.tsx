"use client";
import { useCallback, useEffect, useState } from "react";
import { Ban, Check, ChevronDown, Edit3, Hash, Lock, Plus, Shield, Trash2, Users, Volume2, X } from "lucide-react";
import { Avatar } from "../v2/ui-kit";
import { apiV3, updateError, type Channel, type Member, type ServerRole, type Assignment, type Category, type ChannelGrant } from "./client";

type Tab="server"|"channels"|"roles"|"members"|"bans";
type Flags={channels:boolean;messages:boolean;moderation:boolean;roles:boolean};
const emptyFlags:Flags={channels:false,messages:false,moderation:false,roles:false};
const permissionLabels:{key:keyof Flags;label:string}[]=[
 {key:"channels",label:"Gerenciar canais"},
 {key:"messages",label:"Moderar mensagens"},
 {key:"moderation",label:"Expulsar e banir membros"},
 {key:"roles",label:"Gerenciar cargos"}
];
export function CommunityPanel({serverId,serverName,serverIcon,inviteCode,isOwner,members,onClose,onUpdated,onOpenDm}:{
 serverId:string;serverName:string;serverIcon:string|null;inviteCode:string;isOwner:boolean;
 members:Member[];onClose:()=>void;onUpdated:()=>void;onOpenDm:(userId:string)=>void;
}){
 const [tab,setTab]=useState<Tab>("server");
 const [serverNameDraft,setServerNameDraft]=useState(serverName);
 const [categories,setCategories]=useState<Category[]>([]);
 const [categoryName,setCategoryName]=useState("");
 const [grants,setGrants]=useState<ChannelGrant[]>([]);
 const [newCategoryId,setNewCategoryId]=useState("");
 const [editCategoryId,setEditCategoryId]=useState("");
 const [channels,setChannels]=useState<Channel[]>([]);
 const [roles,setRoles]=useState<ServerRole[]>([]);
 const [assignments,setAssignments]=useState<Assignment[]>([]);
 const [bans,setBans]=useState<{user_id:string;name:string;reason:string}[]>([]);
 const [canManageChannels,setCanManageChannels]=useState(false);
 const [canManageRoles,setCanManageRoles]=useState(false);
 const [canModerate,setCanModerate]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [newChannel,setNewChannel]=useState("");
 const [kind,setKind]=useState<"text"|"voice">("text");
 const [privateChannel,setPrivateChannel]=useState(false);
 const [editChannelId,setEditChannelId]=useState<string|null>(null);
 const [editChannelName,setEditChannelName]=useState("");
 const [editPrivate,setEditPrivate]=useState(false);
 const [newRole,setNewRole]=useState("");
 const [roleColor,setRoleColor]=useState("#a7a7a7");
 const [priority,setPriority]=useState(10);
 const [flags,setFlags]=useState<Flags>(emptyFlags);
 const [editRoleId,setEditRoleId]=useState<string|null>(null);
 const [refreshing,setRefreshing]=useState(true);

 const load=useCallback(async()=>{
  const [c,r,cat]=await Promise.all([
   apiV3<{channels:Channel[];canManage:boolean;grants:ChannelGrant[]}>("/api/v3/channels?serverId="+encodeURIComponent(serverId)),
   apiV3<{roles:ServerRole[];assignments:Assignment[];canManage:boolean}>("/api/v3/roles?serverId="+encodeURIComponent(serverId)),
   apiV3<{categories:Category[]}>("/api/v3/categories?serverId="+encodeURIComponent(serverId))
  ]);
  setChannels(c.channels);setCanManageChannels(c.canManage);setGrants(c.grants);setCategories(cat.categories);
  setRoles(r.roles);setAssignments(r.assignments);setCanManageRoles(r.canManage);
  try{
   const mod=await apiV3<{bans:{user_id:string;name:string;reason:string}[]}>("/api/v3/moderation?serverId="+encodeURIComponent(serverId));
   setCanModerate(true);setBans(mod.bans);
  }catch{setCanModerate(false);setBans([]);}
 },[serverId]);
 useEffect(()=>{
  let live=true;
  void load().catch(e=>{if(live)setError(updateError(e));}).finally(()=>{if(live)setRefreshing(false);});
  return()=>{live=false;};
 },[load]);

 async function run(work:()=>Promise<unknown>){
  if(busy)return;
  setBusy(true);setError("");
  try{
   const result=await work();
   await load();onUpdated();
   if(result&&typeof result==="object"&&"warning" in result&&typeof result.warning==="string")setError(result.warning);
  }catch(e){setError(updateError(e));}
  finally{setBusy(false);}
 }
 async function createChannel(event:React.FormEvent){
  event.preventDefault();
  if(!newChannel.trim())return;
  await run(async()=>{
   await apiV3("/api/v3/channels","POST",{serverId,name:newChannel,kind,isPrivate:privateChannel,categoryId:newCategoryId||null});
   setNewChannel("");setPrivateChannel(false);
  });
 }
 async function saveChannel(event:React.FormEvent){
  event.preventDefault();
  if(!editChannelId)return;
  await run(async()=>{
   await apiV3("/api/v3/channels","PATCH",{channelId:editChannelId,name:editChannelName,isPrivate:editPrivate,categoryId:editCategoryId||null});
   setEditChannelId(null);
  });
 }
 function beginChannelEdit(channel:Channel){
  setEditChannelId(channel.id);setEditChannelName(channel.name);setEditPrivate(channel.is_private);setEditCategoryId(channel.category_id||"");
 }
 async function createCategory(event:React.FormEvent){
  event.preventDefault();if(!categoryName.trim())return;
  await run(async()=>{await apiV3("/api/v3/categories","POST",{serverId,name:categoryName});setCategoryName("");});
 }
 async function deleteCategory(category:Category){
  if(!window.confirm("Excluir a categoria "+category.name+"? Os canais continuarão existindo."))return;
  await run(()=>apiV3("/api/v3/categories","DELETE",{categoryId:category.id}));
 }
 async function toggleGrant(channelId:string,roleId:string,enabled:boolean){
  await run(()=>apiV3("/api/v3/channels","PATCH",{channelId,roleId,enabled,action:"grant"}));
 }
 async function saveServer(event:React.FormEvent){
  event.preventDefault();await run(()=>apiV3("/api/v3/server-settings","PATCH",{serverId,name:serverNameDraft}));
 }
 async function changeServerIcon(file?:File){
  if(!file)return;
  if(!file.type.startsWith("image/")){setError("Escolha uma imagem.");return;}
  try{
   const bmp=await createImageBitmap(file),canvas=document.createElement("canvas");
   canvas.width=256;canvas.height=256;
   const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível processar o ícone.");
   const scale=Math.max(256/bmp.width,256/bmp.height);
   ctx.drawImage(bmp,(256-bmp.width*scale)/2,(256-bmp.height*scale)/2,bmp.width*scale,bmp.height*scale);
   bmp.close();const data=canvas.toDataURL("image/webp",.76);
   if(data.length>160000)throw new Error("Ícone muito grande.");
   await run(()=>apiV3("/api/v3/server-settings","PATCH",{serverId,icon:data}));
  }catch(e){setError(updateError(e));}
 }
 async function rotateInvite(){
  if(!window.confirm("Renovar o código de convite? O código anterior deixará de funcionar."))return;
  await run(()=>apiV3("/api/v3/server-settings","POST",{serverId}));
 }
 async function deleteChannel(channel:Channel){
  if(!window.confirm('Excluir o canal "'+channel.name+'"? As mensagens serão preservadas no canal geral.'))return;
  await run(()=>apiV3("/api/v3/channels","DELETE",{channelId:channel.id}));
 }
 async function saveRole(event:React.FormEvent){
  event.preventDefault();
  if(newRole.trim().length<2)return;
  await run(async()=>{
   const permissions=flags;
   if(editRoleId)await apiV3("/api/v3/roles","PATCH",{serverId,roleId:editRoleId,name:newRole,color:roleColor,priority,permissions});
   else await apiV3("/api/v3/roles","POST",{serverId,name:newRole,color:roleColor,priority,permissions});
   resetRole();
  });
 }
 function resetRole(){setNewRole("");setRoleColor("#a7a7a7");setFlags(emptyFlags);setPriority(10);setEditRoleId(null);}
 function beginRoleEdit(role:ServerRole){
  setEditRoleId(role.id);setNewRole(role.name);setRoleColor(role.color);setPriority(role.priority);
  setFlags({channels:role.manage_channels,messages:role.manage_messages,moderation:role.moderate_members,roles:role.manage_roles});
 }
 async function toggleRole(userId:string,roleId:string){
  const assigned=assignments.some(a=>a.user_id===userId&&a.role_id===roleId);
  await run(()=>apiV3("/api/v3/roles","PATCH",{action:assigned?"unassign":"assign",serverId,userId,roleId}));
 }
 async function moderate(userId:string,name:string,action:"kick"|"ban"|"unban"){
  if(action!=="unban"&&!window.confirm((action==="ban"?"Banir ":"Expulsar ")+name+" deste servidor?"))return;
  const reason=action==="ban"?window.prompt("Motivo (opcional, até 300 caracteres):","")||"":undefined;
  await run(()=>apiV3("/api/v3/moderation","POST",{serverId,userId,action,reason}));
 }
 async function block(userId:string,name:string){
  if(!window.confirm("Bloquear "+name+" nas mensagens privadas?"))return;
  await run(()=>apiV3("/api/v3/blocks","POST",{userId}));
 }
 return <div className="v3-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section className="v3-community-dialog" role="dialog" aria-modal="true" aria-label="Configurações do servidor">
   <aside className="v3-community-nav">
    <div className="v3-community-brand"><Shield size={18}/><span>Configurações</span></div>
    <button className={tab==="server"?"selected":""} onClick={()=>setTab("server")}><Shield size={16}/> Servidor</button>
    <button className={tab==="channels"?"selected":""} onClick={()=>setTab("channels")}><Hash size={16}/> Canais</button>
    <button className={tab==="roles"?"selected":""} onClick={()=>setTab("roles")}><Shield size={16}/> Cargos</button>
    <button className={tab==="members"?"selected":""} onClick={()=>setTab("members")}><Users size={16}/> Membros</button>
    {canModerate&&<button className={tab==="bans"?"selected":""} onClick={()=>setTab("bans")}><Ban size={16}/> Banimentos</button>}
    <div className="v3-community-nav-caption">LumaCall 3.0 · Comunidade</div>
   </aside>
   <div className="v3-community-content">
    <header className="v3-community-heading"><div><span>SEU SERVIDOR</span><h2>{tab==="server"?"Visão geral":tab==="channels"?"Canais":tab==="roles"?"Cargos e permissões":tab==="members"?"Membros":"Banimentos"}</h2></div>
     <button type="button" className="v3-icon-btn" title="Fechar" aria-label="Fechar configurações" onClick={onClose}><X size={20}/></button>
    </header>
    {error&&<p className="v3-error" role="alert">{error}</p>}
    {refreshing?<p className="v3-muted">Carregando configurações…</p>:<>
     {tab==="server"&&<>
      <p className="v3-muted">Identidade visual e opções básicas do servidor.</p>
      <div className="v3-server-presentation">
       {serverIcon?<img src={serverIcon} alt="Ícone do servidor" width={78} height={78}/>:<div className="v3-server-fallback">{serverName.slice(0,2).toUpperCase()}</div>}
       <div><strong>{serverName}</strong><small>Comunidade privada · até 6 membros</small></div>
      </div>
      {isOwner?<form className="v3-settings-form" onSubmit={e=>void saveServer(e)}>
       <strong>Personalização</strong>
       <label>Nome do servidor<input value={serverNameDraft} onChange={e=>setServerNameDraft(e.target.value)} minLength={3} maxLength={45} required/></label>
       <label className="v3-server-upload">Alterar ícone <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void changeServerIcon(e.target.files?.[0])}/></label>
       <button type="submit" className="v3-primary" disabled={busy}>Salvar informações</button>
      </form>:<p className="v3-muted">Somente o dono pode alterar a identidade do servidor.</p>}
      <div className="v3-settings-form">
       <strong>Convite</strong>
       <p className="v3-muted">Compartilhe este código apenas com quem deve participar do servidor.</p>
       <div className="v3-invite-preview"><code>{inviteCode}</code><button type="button" onClick={()=>void navigator.clipboard.writeText(inviteCode).catch(()=>setError("Não foi possível copiar."))}>Copiar código</button></div>
       {isOwner&&<button type="button" disabled={busy} onClick={()=>void rotateInvite()}>Renovar código e invalidar o antigo</button>}
      </div>
     </>}
     {tab==="channels"&&<>
      <p className="v3-muted">Organize conversas e chamadas. Somente quem tem permissão pode alterar a estrutura.</p>
      <div className="v3-list">
       {channels.map(c=><div className="v3-list-entry" key={c.id}>
        <div className="v3-list-meta">{c.kind==="text"?<Hash size={18}/>:<Volume2 size={18}/>}
         <div><strong>{c.name}</strong><small>{c.kind==="text"?"Texto":"Voz"}{c.is_private?" · Privado":""}{c.category_id?" · "+(categories.find(cat=>cat.id===c.category_id)?.name||"Categoria"):""}</small></div>
         {c.is_private&&<Lock size={13}/>}
        </div>
        {canManageChannels&&<div className="v3-row-actions">
         <button type="button" title="Editar canal" onClick={()=>beginChannelEdit(c)}><Edit3 size={15}/></button>
         <button type="button" disabled={busy} title="Excluir canal" onClick={()=>void deleteChannel(c)}><Trash2 size={15}/></button>
        </div>}
       </div>)}
      </div>
      {canManageChannels&&<>
       {editChannelId&&<form className="v3-settings-form" onSubmit={e=>void saveChannel(e)}>
        <strong>Editar canal</strong>
        <label>Nome<input maxLength={32} required value={editChannelName} onChange={e=>setEditChannelName(e.target.value)}/></label>
 <label>Categoria<select value={editCategoryId} onChange={e=>setEditCategoryId(e.target.value)}><option value="">Sem categoria</option>{categories.map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label>
        <label className="v3-checkline"><input type="checkbox" checked={editPrivate} disabled={channels.some(c=>c.id===editChannelId&&c.is_private)} onChange={e=>setEditPrivate(e.target.checked)}/> Canal privado (visível apenas para o dono ou cargos autorizados)</label>
        {channels.some(c=>c.id===editChannelId&&c.is_private)&&<small className="v3-muted">Por segurança, um canal privado não pode se tornar público. Crie outro canal público se precisar.</small>}
 {editPrivate&&roles.length>0&&<div className="v3-role-grants"><strong>Cargos autorizados</strong>
  {roles.map(role=><label key={role.id} className="v3-checkline">
   <input type="checkbox" checked={grants.some(g=>g.channel_id===editChannelId&&g.role_id===role.id)}
     onChange={e=>{if(editChannelId)void toggleGrant(editChannelId,role.id,e.target.checked)}}/>
   <span className="v3-role-dot" style={{background:role.color}}/>{role.name}
  </label>)}
 </div>}
        <div className="v3-inline-actions"><button type="submit" disabled={busy} className="v3-primary">Salvar alterações</button><button type="button" onClick={()=>setEditChannelId(null)}>Cancelar</button></div>
       </form>}
       <form className="v3-settings-form" onSubmit={e=>void createChannel(e)}>
        <strong>Criar canal</strong>
        <label>Nome<input required minLength={1} maxLength={32} placeholder="nome-do-canal" value={newChannel} onChange={e=>setNewChannel(e.target.value)}/></label>
        <label>Tipo<select value={kind} onChange={e=>setKind(e.target.value as "text"|"voice")}><option value="text">Canal de texto</option><option value="voice">Canal de voz</option></select></label>
 <label>Categoria<select value={newCategoryId} onChange={e=>setNewCategoryId(e.target.value)}><option value="">Sem categoria</option>{categories.map(cat=><option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></label>
        <label className="v3-checkline"><input type="checkbox" checked={privateChannel} onChange={e=>setPrivateChannel(e.target.checked)}/> Privado (inicialmente apenas para o dono)</label>
        <button type="submit" disabled={busy} className="v3-primary"><Plus size={16}/> Criar canal</button>
       </form>
      </>}
     </>}
     {canManageChannels&&tab==="channels"&&<div className="v3-settings-form">
 <strong>Categorias</strong>
 <p className="v3-muted">Organize canais em seções. Excluir uma categoria não exclui seus canais.</p>
 {categories.map(cat=><div key={cat.id} className="v3-list-entry"><strong>{cat.name}</strong>
  <button type="button" title="Excluir categoria" onClick={()=>void deleteCategory(cat)}><Trash2 size={15}/></button>
 </div>)}
 <form onSubmit={e=>void createCategory(e)} className="v3-category-add">
  <input required minLength={2} maxLength={32} value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="Nova categoria"/>
  <button type="submit" disabled={busy}><Plus size={16}/> Criar categoria</button>
 </form>
</div>}
{tab==="roles"&&<>
      <p className="v3-muted">Cargos definem a aparência e as permissões. Apenas o dono pode criá-los ou atribuí-los.</p>
      <div className="v3-list">{roles.map(r=><div className="v3-list-entry" key={r.id}>
       <div className="v3-list-meta"><span className="v3-role-dot" style={{background:r.color}}/><div><strong>{r.name}</strong><small>Prioridade {r.priority} · {[
        r.manage_channels?"Canais":null,r.manage_messages?"Mensagens":null,r.moderate_members?"Moderação":null,r.manage_roles?"Cargos":null].filter(Boolean).join(", ")||"Decorativo"}</small></div></div>
       {canManageRoles&&<div className="v3-row-actions"><button title="Editar cargo" onClick={()=>beginRoleEdit(r)}><Edit3 size={15}/></button>
        <button title="Excluir cargo" onClick={()=>{if(window.confirm("Excluir o cargo "+r.name+"?"))void run(()=>apiV3("/api/v3/roles","DELETE",{serverId,roleId:r.id}))}}><Trash2 size={15}/></button></div>}
      </div>)}</div>
      {canManageRoles&&<form className="v3-settings-form" onSubmit={e=>void saveRole(e)}>
       <strong>{editRoleId?"Editar cargo":"Novo cargo"}</strong>
       <label>Nome<input required minLength={2} maxLength={32} value={newRole} onChange={e=>setNewRole(e.target.value)} placeholder="Moderador"/></label>
       <div className="v3-inline">
        <label>Cor<input type="color" value={roleColor} onChange={e=>setRoleColor(e.target.value)}/></label>
        <label>Prioridade<input type="number" min={0} max={100} value={priority} onChange={e=>setPriority(Number(e.target.value))}/></label>
       </div>
       {permissionLabels.map(p=><label key={p.key} className="v3-checkline"><input type="checkbox" checked={flags[p.key]} onChange={e=>setFlags(old=>({...old,[p.key]:e.target.checked}))}/>{p.label}</label>)}
       <div className="v3-inline-actions"><button className="v3-primary" disabled={busy} type="submit"><Check size={15}/> {editRoleId?"Salvar cargo":"Criar cargo"}</button>
       {editRoleId&&<button type="button" onClick={resetRole}>Cancelar</button>}</div>
      </form>}
     </>}
     {tab==="members"&&<>
      <p className="v3-muted">{members.length}/6 membros. Atribua cargos ou gerencie membros conforme suas permissões.</p>
      <div className="v3-list">
       {members.map(m=><div key={m.id} className="v3-list-entry v3-member-item">
        <div className="v3-list-meta"><Avatar name={m.name} src={m.avatar_data_url} badge={m.badge} size={37}/>
         <div><strong>{m.name}</strong><small>{m.role==="owner"?"Dono do servidor":roles.filter(r=>assignments.some(a=>a.user_id===m.id&&a.role_id===r.id)).map(r=>r.name).join(", ")||"Membro"}</small></div>
        </div>
        <div className="v3-member-buttons">
         <button type="button" onClick={()=>{onOpenDm(m.id);onClose();}}>Mensagem</button>
         {canManageRoles&&m.role!=="owner"&&roles.length>0&&<label className="v3-assign-label">Adicionar cargo<select value="" onChange={e=>{if(e.target.value)void toggleRole(m.id,e.target.value)}}>
          <option value="">Selecione…</option>{roles.filter(r=>!assignments.some(a=>a.user_id===m.id&&a.role_id===r.id)).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
         </select></label>}
         {canManageRoles&&m.role!=="owner"&&roles.filter(r=>assignments.some(a=>a.user_id===m.id&&a.role_id===r.id)).map(r=><button className="v3-role-assigned" key={r.id} onClick={()=>void toggleRole(m.id,r.id)} title="Remover este cargo" style={{borderColor:r.color}}>{r.name} ×</button>)}
         <button type="button" onClick={()=>void block(m.id,m.name)}>Bloquear</button>
         {canModerate&&m.role!=="owner"&&<><button type="button" onClick={()=>void moderate(m.id,m.name,"kick")}>Expulsar</button><button className="v3-danger" type="button" onClick={()=>void moderate(m.id,m.name,"ban")}>Banir</button></>}
        </div>
       </div>)}
      </div>
     </>}
     {tab==="bans"&&canModerate&&<>
      <p className="v3-muted">Membros banidos não podem voltar usando convites.</p>
      <div className="v3-list">{bans.length===0?<p className="v3-muted">Nenhum membro banido.</p>:bans.map(b=><div className="v3-list-entry" key={b.user_id}>
       <div className="v3-list-meta"><Ban size={17}/><div><strong>{b.name}</strong><small>{b.reason||"Sem motivo informado"}</small></div></div>
       <button type="button" onClick={()=>void moderate(b.user_id,b.name,"unban")}>Remover banimento</button>
      </div>)}</div>
     </>}
    </>}
   </div>
  </section>
 </div>;
}
