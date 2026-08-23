// src/lib/fanfarra/banEnforcement.ts
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect } from "react";
import { auth, db } from "./firebase";
import { signOut } from "./auth";
import { toast } from "sonner";

export function useEnforceBanStatus(uid: string | undefined | null): void {
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "public_profiles", uid), (snap) => {
      // Ignora o snapshot que vem do cache local (IndexedDB) — ele pode
      // estar desatualizado, por exemplo se a conta foi desbanida mas o
      // dispositivo ainda lembra do banimento anterior. Só age quando o
      // dado já foi confirmado pelo servidor.
      if (snap.metadata.fromCache) return;
      const data = snap.data();
      if (!data) return;
      const banned = data.banned === true;
      const suspendedUntil = typeof data.suspendedUntil === "number" ? data.suspendedUntil : 0;
      const suspended = suspendedUntil > Date.now();
      if (banned || suspended) {
        toast.error(
          banned
            ? "Sua conta foi banida por violar as diretrizes da comunidade."
            : "Sua conta está suspensa temporariamente.",
        );
        signOut();
      }
    });
    return () => unsub();
  }, [uid]);
}