// src/lib/fanfarra/dataExport.ts
// Exportação dos dados pessoais do usuário em JSON — direito de
// portabilidade de dados (LGPD). Roda 100% no client: lê só o que já é
// permitido pra dono do próprio dado, monta um arquivo e baixa na hora.
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";

async function whereEquals(collectionName: string, field: string, value: string) {
  const snap = await getDocs(query(collection(db, collectionName), where(field, "==", value)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function whereArrayContains(collectionName: string, field: string, value: string) {
  const snap = await getDocs(query(collection(db, collectionName), where(field, "array-contains", value)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function exportMyData(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Você precisa estar logado para exportar seus dados.");
  const uid = user.uid;

  const [
    profileSnap,
    settingsSnap,
    works,
    goals,
    bookcases,
    friendships,
    followingFollows,
    followerFollows,
    blocksCreated,
    communityRecs,
  ] = await Promise.all([
    getDoc(doc(db, "profiles", uid)),
    getDoc(doc(db, "settings", uid)),
    whereEquals("works", "uid", uid),
    whereEquals("personal_goals", "uid", uid),
    whereEquals("bookcases", "uid", uid),
    whereArrayContains("friendships", "members", uid),
    whereEquals("follows", "followerUid", uid),
    whereEquals("follows", "followingUid", uid),
    whereEquals("blocks", "blockerUid", uid),
    whereEquals("communityRecs", "uid", uid),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { uid, email: user.email, criadoEm: user.metadata.creationTime },
    perfil: profileSnap.exists() ? profileSnap.data() : null,
    configuracoes: settingsSnap.exists() ? settingsSnap.data() : null,
    biblioteca: works,
    metasPessoais: goals,
    estantes: bookcases,
    amizades: friendships,
    seguindo: followingFollows,
    seguidoresDe: followerFollows,
    bloqueios: blocksCreated,
    recomendacoesPostadas: communityRecs,
    observacao:
      "Este arquivo inclui seus dados principais (perfil, biblioteca, metas, estantes e relações sociais). " +
      "Mensagens de chat, comentários e reações não estão incluídos nesta versão — entre em contato pelo " +
      "Feedback do app se precisar deles.",
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fanfarra-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}