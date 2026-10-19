"use client";
import { startTransition, useEffect, useRef, useState } from "react";
export function StoreImage({src,alt="",...props}:Omit<React.ImgHTMLAttributes<HTMLImageElement>,"src">&{src:string}){
 const [failed,setFailed]=useState<string>();
 const image=useRef<HTMLImageElement>(null);
 useEffect(()=>{if(image.current?.complete&&image.current.naturalWidth===0)startTransition(()=>setFailed(src))},[src]);
 return <img {...props} ref={image} src={failed===src?"/images/object-placeholder.svg":src} alt={alt} onError={()=>setFailed(src)}/>;
}
