import { reservedAvatarForBadge } from "@/lib/reserved-profile";
export const badgeNames:Record<string,string>={
  creator:"CRIADOR",
  editor:"EDITOR",
  imperio_sohlar:"IMPÉRIO SOHLAR",
  princesa_tess:"PRINCESA TESS",
  bolacha_oreo:"BOLACHAOREO"
};
export function Avatar({name,src,badge,size=38}:{name:string;src?:string|null;badge?:string|null;size?:number}){
  const reserved=badge==="princesa_tess"?"/avatars/shine.webp":badge==="bolacha_oreo"?"/avatars/aldron.webp":reservedAvatarForBadge(badge||undefined);
  const image=src||reserved;
  return image?<img className="v2-avatar" src={image} alt="" style={{width:size,height:size}}/>:<span className="v2-avatar v2-avatar-fallback" style={{width:size,height:size,fontSize:Math.round(size*.38)}} aria-hidden="true">{(name||"?").slice(0,1).toUpperCase()}</span>;
}
export function Badge({badge}:{badge?:string|null}){
  return badge&&badgeNames[badge]?<span className={"v2-badge v2-badge-"+badge}>{badgeNames[badge]}</span>:null;
}
export function Brand(){
  return <div className="v2-brand"><img src="/icons/lumacall-obsidian-mark.svg" alt="" width="33" height="33"/><strong>LumaCall</strong><span>3.0</span></div>;
}
