"use client";
import { useEffect, useState } from "react";
import { Download, X, Monitor, Smartphone } from "lucide-react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted"|"dismissed" }>;
};
type Device = "windows"|"android"|"ios"|"other";

function detectDevice():Device {
  const ua=navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows/.test(ua)) return "windows";
  return "other";
}
export function InstallLumaCall({compact=false}:{compact?:boolean}) {
  const [installEvent,setInstallEvent]=useState<InstallPrompt|null>(null);
  const [installed,setInstalled]=useState(false);
  const [showHelp,setShowHelp]=useState(false);
  const [device,setDevice]=useState<Device>("other");

  useEffect(()=>{
    setDevice(detectDevice());
    const standalone=window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
    setInstalled(standalone);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
    const onPrompt=(event:Event)=>{
      event.preventDefault();
      setInstallEvent(event as InstallPrompt);
    };
    const onInstalled=()=>{setInstalled(true);setInstallEvent(null);setShowHelp(false);};
    window.addEventListener("beforeinstallprompt",onPrompt);
    window.addEventListener("appinstalled",onInstalled);
    return ()=>{
      window.removeEventListener("beforeinstallprompt",onPrompt);
      window.removeEventListener("appinstalled",onInstalled);
    };
  },[]);

  async function install(){
    if(installEvent){
      try{
        await installEvent.prompt();
        const choice=await installEvent.userChoice;
        if(choice.outcome==="accepted")setInstalled(true);
      }catch{setShowHelp(true);}
      finally{setInstallEvent(null);}
    }else{
      setShowHelp(true);
    }
  }
  if(installed)return null;
  return <>
    <button
      type="button"
      className={"v2-install-button"+(compact?" v2-install-compact":"")}
      title="Instalar LumaCall como aplicativo do navegador"
      onClick={()=>void install()}
    ><Download size={compact?17:16}/><span>Instalar aplicativo</span></button>
    {showHelp&&<div className="v2-install-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setShowHelp(false)}}>
      <section className="v2-install-dialog" role="dialog" aria-modal="true" aria-label="Instalar aplicativo LumaCall">
        <button className="v2-install-close" type="button" aria-label="Fechar" onClick={()=>setShowHelp(false)}><X size={18}/></button>
        <div className="v2-install-symbol">{device==="android"||device==="ios"?<Smartphone size={25}/>:<Monitor size={25}/>}</div>
        <h2>Instalar LumaCall</h2>
        <p>O mesmo LumaCall, em uma janela própria, sem abas e sem a barra de endereço. As contas e chamadas continuam no site.</p>
        {device==="android"?<ol>
          <li>Abra <strong>lunacall.vercel.app</strong> no Chrome.</li>
          <li>Toque nos três pontos <strong>⋮</strong> do navegador.</li>
          <li>Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
          <li>Confirme. O LumaCall aparecerá entre seus aplicativos.</li>
        </ol>:device==="ios"?<ol>
          <li>Abra <strong>lunacall.vercel.app</strong> no Safari.</li>
          <li>Toque em <strong>Compartilhar</strong> e em <strong>Adicionar à Tela de Início</strong>.</li>
          <li>Ative <strong>Abrir como App da Web</strong>, se aparecer, e confirme.</li>
        </ol>:<ol>
          <li>Abra <strong>lunacall.vercel.app</strong> no Google Chrome.</li>
          <li>No menu <strong>⋮</strong>, procure <strong>Instalar página como app</strong> (em “Transmitir, salvar e compartilhar”).</li>
          <li>Confirme. Um ícone do LumaCall será instalado no computador.</li>
        </ol>}
        <button type="button" className="v2-install-done" onClick={()=>setShowHelp(false)}>Entendi</button>
      </section>
    </div>}
  </>;
}
