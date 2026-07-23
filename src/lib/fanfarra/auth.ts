import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  verifyBeforeUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  deleteUser as firebaseDeleteUser,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { deleteNominationsAndReactionsForUser } from "./nominationsStore";
import { auth, db } from "./firebase";
import { deleteAllWorksForUser } from "./store";
import { deleteAllBookcasesForUser } from "./bookcaseStore";
import { deleteAwardVotesForUser } from "./awardsStore";
import { deleteAllRecommendationsForUser } from "./communityStore";
import { deleteRemainingUserData, setSkipNextProfileAutoSeed } from "./extras";
import { useEffect, useState, useSyncExternalStore } from "react";
import { initPurchases, logOutPurchases } from "./purchases";

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  emailVerified: boolean;
  provider: "email" | "google";
  createdAt: number;
}

function toAuthUser(u: FirebaseUser): AuthUser {
  return {
    uid: u.uid,
    email: u.email ?? "",
    displayName: u.displayName ?? "",
    photoURL: u.photoURL ?? undefined,
    emailVerified: u.emailVerified,
    provider: u.providerData[0]?.providerId === "google.com" ? "google" : "email",
    createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).getTime() : Date.now(),
  };
}

let cache: AuthUser | null = null;
let ready = false;
const listeners = new Set<() => void>();

// escuta o Firebase uma única vez e mantém o cache local em dia
onAuthStateChanged(auth, (u) => {
  cache = u ? toAuthUser(u) : null;
  ready = true;
  listeners.forEach((l) => l());
  if (u) {
    initPurchases(u.uid).catch((e) => console.error("RevenueCat initPurchases falhou:", e));
  } else {
    logOutPurchases().catch(() => {});
  }
});

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuthUser(): AuthUser | null {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useSyncExternalStore(
    subscribe,
    () => cache,
    () => null,
  );
  return mounted ? data : null;
}

// true enquanto o Firebase ainda não confirmou se há sessão salva
export function useAuthReady(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isReady = useSyncExternalStore(
    subscribe,
    () => ready,
    () => false,
  );
  return mounted && isReady;
}

export function useIsAuthenticated(): boolean {
  return !!useAuthUser();
}

export function getCurrentUser(): AuthUser | null {
  return cache;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
  return toAuthUser(cred.user);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string,
): Promise<AuthUser> {
  setSkipNextProfileAutoSeed(true);
  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password.trim(),
    );
    await updateProfile(cred.user, { displayName: username });
    await setDoc(
      doc(db, "profiles", cred.user.uid),
      {
        username,
        email: email.trim().toLowerCase(),
        bio: "Mergulhada no universo fandom ✦",
        streakDays: 0,
        lastActiveDate: null,
        earnedBadgeIds: [],
      },
      { merge: true },
    );
    await firebaseSendEmailVerification(cred.user);
    return toAuthUser(cred.user);
  } catch (err) {
    setSkipNextProfileAutoSeed(false);
    throw err;
  }
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  const result = await FirebaseAuthentication.signInWithGoogle();
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error("Não foi possível obter o token do Google.");
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  return toAuthUser(cred.user);
}

export function signOut(): void {
  firebaseSignOut(auth);
}

export function sendEmailVerification(): void {
  if (auth.currentUser) firebaseSendEmailVerification(auth.currentUser);
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  await firebaseSendPasswordResetEmail(auth, email.trim());
}

// agora verifica de verdade se o usuário clicou no link do e-mail
export async function checkEmailVerified(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await auth.currentUser.reload();
  const verified = auth.currentUser.emailVerified;
  cache = cache ? { ...cache, emailVerified: verified } : cache;
  listeners.forEach((l) => l());
  return verified;
}

export function updateUserProfile(
  patch: Partial<Pick<AuthUser, "displayName" | "photoURL">>,
): void {
  if (auth.currentUser) updateProfile(auth.currentUser, patch);
}

// Reautentica o usuário atual — exigido pelo Firebase antes de operações
// sensíveis (trocar e-mail, trocar senha, excluir conta). Contas Google usam
// popup; contas de e-mail/senha exigem a senha atual.
async function reauthenticate(currentPassword?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Nenhum usuário autenticado.");

  const isGoogle = user.providerData[0]?.providerId === "google.com";
  if (isGoogle) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    return;
  }

  if (!user.email) throw new Error("Usuário sem e-mail cadastrado.");
  if (!currentPassword) {
    const err = new Error("Informe sua senha atual.") as Error & { code?: string };
    err.code = "auth/missing-password";
    throw err;
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

// Envia um link de confirmação para o novo e-mail. O e-mail só passa a valer
// de fato depois que o usuário clica no link (comportamento atual do
// Firebase para essa operação, mais seguro que a troca direta).
export async function changeUserEmail(newEmail: string, currentPassword?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Nenhum usuário autenticado.");
  await reauthenticate(currentPassword);
  await verifyBeforeUpdateEmail(user, newEmail.trim().toLowerCase());
}

export async function changeUserPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Nenhum usuário autenticado.");
  await reauthenticate(currentPassword);
  await firebaseUpdatePassword(user, newPassword.trim());
}

// Reautentica, apaga os dados do usuário no Firestore (obras, estantes,
// votos do Awards e recomendações públicas) e por fim remove a conta do
// Firebase Auth.
//
// Usa allSettled (em vez de Promise.all) de propósito: se a limpeza de UMA
// coleção falhar (ex.: regra de segurança do Firestore ainda não configurada
// para "communityRecs"), isso não pode travar a exclusão da conta inteira —
// o erro só fica registrado no console, e a conta é excluída normalmente.
export async function deleteUserAccount(currentPassword?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Nenhum usuário autenticado.");
  await reauthenticate(currentPassword);

  const uid = user.uid;
 const results = await Promise.allSettled([
    deleteAllWorksForUser(uid),
    deleteAllBookcasesForUser(uid),
    deleteAwardVotesForUser(uid),
    deleteAllRecommendationsForUser(uid),
    deleteNominationsAndReactionsForUser(uid), // ← nova linha
    deleteRemainingUserData(uid),
  ]);
  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error(
        "Falha ao limpar parte dos dados do usuário (conta será excluída mesmo assim):",
        r.reason,
      );
    }
  });

  await firebaseDeleteUser(user);
}

export function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "E-mail ou senha incorretos.";
    case "auth/missing-password":
      return "Informe sua senha atual.";
    case "auth/email-already-in-use":
      return "Este e-mail já está em uso.";
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/weak-password":
      return "Senha muito fraca (mín. 6 caracteres).";
    case "auth/requires-recent-login":
      return "Por segurança, confirme sua senha atual novamente.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um pouco e tente de novo.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Janela do Google fechada antes de concluir.";
    case "auth/user-mismatch":
      return "As credenciais não correspondem a este usuário.";
    case "auth/network-request-failed":
      return "Sem conexão. Verifique sua internet.";
    case "auth/unauthorized-domain":
      return "Este endereço não está autorizado no Firebase.";
    case "permission-denied":
    case "firestore/permission-denied":
      return "Sem permissão para completar esta ação. Verifique as regras do Firestore.";
    default:
      return "Ocorreu um erro. Tente novamente.";
  }
}
