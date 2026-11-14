export type Channel={id:string;server_id:string;name:string;kind:"text"|"voice";position:number;is_private:boolean};
export type ServerRole={id:string;name:string;color:string;priority:number;manage_channels:boolean;manage_messages:boolean;moderate_members:boolean;manage_roles:boolean};
export type Assignment={role_id:string;user_id:string};
export type Member={id:string;name:string;badge:string|null;avatar_data_url:string|null;role:string;presence?:string;bio?:string};
export type ChatMessage={id:string;user_id:string;name:string;badge:string|null;avatar_data_url:string|null;content:string;created_at:string;edited_at?:string|null;deleted_at?:string|null};
export type Reaction={message_id:string;emoji:string;user_id:string};
export async function apiV3<T>(path:string,method="GET",body?:unknown):Promise<T>{
 const r=await fetch(path,{method,headers:body===undefined?undefined:{"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),credentials:"same-origin",cache:"no-store"});
 const data=await r.json().catch(()=>({error:"Não foi possível ler a resposta."}));
 if(!r.ok)throw new Error(typeof data.error==="string"?data.error:"Operação indisponível.");
 return data as T;
}
export const updateError=(reason:unknown)=>reason instanceof Error?reason.message:"A operação não pôde ser concluída.";
