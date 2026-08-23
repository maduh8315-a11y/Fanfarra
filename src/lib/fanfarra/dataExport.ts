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

async function getDocIfExists(collectionName: string, id: string) {
  const snap = await getDoc(doc(db, collectionName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// friend_requests não tem um único campo "uid" — o pedido tem quem manda
// (fromUid) e quem recebe (toUid). Busca os dois lados e junta sem duplicar.
async function myFriendRequests(uid: string) {
  const [sent, received] = await Promise.all([
    whereEquals("friend_requests", "fromUid", uid),
    whereEquals("friend_requests", "toUid", uid),
  ]);
  const byId = new Map(sent.map((r) => [r.id, r]));
  received.forEach((r) => byId.set(r.id, r));
  return Array.from(byId.values());
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
    friendRequests,
    followingFollows,
    followerFollows,
    blocksCreated,
    communityRecs,
    notifications,
    userChallenges,
    recComments,
    awardReactions,
    awardVoteIndicacao,
    awardVoteFinal,
  ] = await Promise.all([
    getDoc(doc(db, "profiles", uid)),
    getDoc(doc(db, "settings", uid)),
    whereEquals("works", "uid", uid),
    whereEquals("personal_goals", "uid", uid),
    whereEquals("bookcases", "uid", uid),
    whereArrayContains("friendships", "members", uid),
    myFriendRequests(uid),
    whereEquals("follows", "followerUid", uid),
    whereEquals("follows", "followingUid", uid),
    whereEquals("blocks", "blockerUid", uid),
    whereEquals("communityRecs", "uid", uid),
    whereEquals("notifications", "uid", uid),
    whereEquals("user_challenges", "uid", uid),
    whereEquals("rec_comments", "uid", uid),
    whereEquals("award_reactions", "uid", uid),
    getDocIfExists("award_votes_indicacao", uid),
    getDocIfExists("award_votes_final", uid),
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
    pedidosDeAmizade: friendRequests,
    seguindo: followingFollows,
    seguidoresDe: followerFollows,
    bloqueios: blocksCreated,
    recomendacoesPostadas: communityRecs,
    notificacoes: notifications,
    desafios: userChallenges,
    comentarios: recComments,
    reacoesEmIndicacoes: awardReactions,
    votoIndicacaoAwards: awardVoteIndicacao,
    votoFinalAwards: awardVoteFinal,
    observacao:
      "Este arquivo inclui seus dados principais (perfil, biblioteca, metas, estantes, relações sociais, " +
      "notificações, desafios, comentários e votos/reações do Awards). Mensagens de chat não estão incluídas " +
      "nesta versão, por envolverem dados de outras pessoas na conversa — entre em contato pelo Feedback do " +
      "app se precisar delas.",
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