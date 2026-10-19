"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
export function Newsletter() {
  const [email,setEmail]=useState(""),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function subscribe(event:React.FormEvent) {
    event.preventDefault();if(busy)return;setBusy(true);setMessage("");
    try { const response=await fetch("/api/newsletter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,consent})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not save your subscription.");setMessage("You’re on the list. Thank you for making room for us.");setEmail("");setConsent(false); }
    catch(error){setMessage(error instanceof Error?error.message:"Please try again shortly.");}finally{setBusy(false)}
  }
  return <section className="newsletter"><div className="eyebrow">A note from the studio</div><h2>Keep a little room for wonder.</h2><p>New arrivals, thoughtful rituals and stories worth taking slowly.<br/>Only when there is something worth sharing.</p><form onSubmit={subscribe}><div className="newsletter-form"><input type="email" autoComplete="email" aria-label="Email address" placeholder="Your email address" maxLength={200} required value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/><button disabled={busy} type="submit">{busy?"Joining…":<>Join the list <ArrowRight size={12}/></>}</button></div><label className="newsletter-consent"><input type="checkbox" required checked={consent} onChange={event=>setConsent(event.target.checked)} disabled={busy}/>I agree to receive occasional store updates. <a href="/privacy">Privacy information</a></label></form><p role="status">{message}</p></section>;
}
