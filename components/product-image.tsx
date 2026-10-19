"use client";
import { StoreImage } from "@/components/store-image";
import { useRef, useState } from "react";
import { Maximize2, Minus, Plus, X } from "lucide-react";
export function ProductImage({image,name}:{image:string;name:string}){
 const dialog=useRef<HTMLDialogElement>(null);const [zoom,setZoom]=useState(false);
 return <><button className="product-image-button" type="button" aria-label={`Enlarge ${name} image`} onClick={()=>{setZoom(false);dialog.current?.showModal()}}><StoreImage className="detail-image" src={image} alt={name}/><span><Maximize2 size={14}/> A closer look</span></button><dialog ref={dialog} className="image-dialog" aria-label={`${name} enlarged image`}><div className="image-dialog-tools"><span>{name}</span><div><button type="button" className="plain-icon" aria-label={zoom?"Zoom out":"Zoom in"} aria-pressed={zoom} onClick={()=>setZoom(value=>!value)}>{zoom?<Minus/>:<Plus/>}</button><button type="button" className="plain-icon" aria-label="Close enlarged image" onClick={()=>dialog.current?.close()}><X/></button></div></div><div className={`image-dialog-scroll ${zoom?"zoomed":""}`}><StoreImage src={image} alt={name}/></div></dialog></>;
}
