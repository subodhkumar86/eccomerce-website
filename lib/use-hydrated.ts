"use client";
import { useSyncExternalStore } from "react";
const subscribe=()=>()=>{};
const clientSnapshot=()=>true;
const serverSnapshot=()=>false;
// Each consumer keeps the server snapshot while its own HTML hydrates, even
// when a parent provider has already restored browser-local state.
export function useHydrated(){return useSyncExternalStore(subscribe,clientSnapshot,serverSnapshot)}
