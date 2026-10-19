"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { SceneBoundary } from "@/components/object-studio";
import { useSiteMotion } from "@/components/motion-provider";
const HeroScene=dynamic(()=>import("@/components/hero-scene"),{ssr:false});
export default function HeroSceneLoader(){
 const {enabled}=useSiteMotion();const ref=useRef<HTMLDivElement>(null);const [supported,setSupported]=useState(false),[visible,setVisible]=useState(false),[pageVisible,setPageVisible]=useState(true);
 useEffect(()=>{const element=ref.current;if(!element)return;const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting));observer.observe(element);const visibility=()=>setPageVisible(document.visibilityState==="visible");visibility();document.addEventListener("visibilitychange",visibility);try{const canvas=document.createElement("canvas"),gl=canvas.getContext("webgl2");setSupported(Boolean(gl));gl?.getExtension("WEBGL_lose_context")?.loseContext()}catch{setSupported(false)}return()=>{observer.disconnect();document.removeEventListener("visibilitychange",visibility)}},[]);
 return <div ref={ref} className="scene-wrap" aria-hidden="true">{supported&&enabled&&visible&&<SceneBoundary fallback={null}><HeroScene running={pageVisible}/></SceneBoundary>}</div>;
}
