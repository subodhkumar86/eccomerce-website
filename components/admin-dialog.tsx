"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function AdminDialog({ title, children, onClose, busy = false }: { title: string; children: React.ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog=ref.current; dialog?.showModal(); return () => { if(dialog?.open)dialog.close(); }; }, []);
  return <dialog ref={ref} className="admin-dialog" aria-label={title} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}><div className="admin-dialog-heading"><h2>{title}</h2><button className="plain-icon" disabled={busy} aria-label={`Close ${title}`} onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
