"use client";
import { useHydrated } from "@/lib/use-hydrated";
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import { ArrowUp, Pause, Play } from "lucide-react";

const MotionContext=createContext({enabled:false});
export function MotionProvider({children}:{children:React.ReactNode}){
 const [systemReduced,setSystemReduced]=useState(true),[paused,setPaused]=useState(false),[showTop,setShowTop]=useState(false);
 useEffect(()=>{
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");const update=()=>startTransition(()=>setSystemReduced(media.matches));update();media.addEventListener("change",update);
  try{const saved=localStorage.getItem("veloura-motion")==="off";startTransition(()=>setPaused(saved))}catch{}
  const scroll=()=>{startTransition(()=>setShowTop(window.scrollY>650));const total=document.documentElement.scrollHeight-window.innerHeight;document.documentElement.style.setProperty("--reading-progress",String(total>0?window.scrollY/total:0))};scroll();window.addEventListener("scroll",scroll,{passive:true});
  return()=>{media.removeEventListener("change",update);window.removeEventListener("scroll",scroll)};
 },[]);
 const enabled=!systemReduced&&!paused;
 const motionState=useMemo(()=>({enabled}),[enabled]);
 useEffect(()=>{document.documentElement.dataset.motion=enabled?"on":"off"},[enabled]);
 function toggle(){const next=!paused;setPaused(next);try{localStorage.setItem("veloura-motion",next?"off":"auto")}catch{}}
 return <MotionContext.Provider value={motionState}>{children}<div className="reading-progress" aria-hidden="true"/><div className="motion-tools"><button className="motion-toggle" type="button" onClick={toggle} disabled={systemReduced} aria-pressed={!enabled} aria-label={systemReduced?"Animations follow reduced-motion preference":enabled?"Pause animations":"Resume animations"}>{enabled?<Pause size={13}/>:<Play size={13}/>}<span>{systemReduced?"Reduced motion":enabled?"Pause motion":"Resume motion"}</span></button>{showTop&&<button className="back-to-top" type="button" aria-label="Back to top" onClick={()=>window.scrollTo({top:0,behavior:enabled?"smooth":"instant"})}><ArrowUp size={16}/></button>}</div></MotionContext.Provider>;
}
export function useSiteMotion(){const hydrated=useHydrated();const value=useContext(MotionContext);return hydrated?value:{enabled:false}}
