// Recebe o webhook do RevenueCat e atualiza settings/{uid}.pro no Firestore.
// Usa service account (bypassa firestore.rules) — é o ÚNICO lugar que pode
// setar pro:true pra um usuário comum.
import { FirestoreTransaction } from "../googleFirestoreRest.server";

// Ajuste esta lista depois de olhar um evento real no dashboard do
// RevenueCat ("Send test event") — os nomes de type podem ter mudado.
const GRANT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
]);
const REVOKE_EVENTS = new Set(["EXPIRATION"]);

export async function handleRevenueCatWebhook(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const expected = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return new Response("unauthorized", { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const event = body?.event;
  const uid: string | undefined = event?.app_user_id;
  const type: string | undefined = event?.type;
  const entitlements: string[] = event?.entitlement_ids ?? [];

  if (!uid || !type) return new Response("ignored", { status: 200 });
  if (!entitlements.includes("pro") && !REVOKE_EVENTS.has(type)) {
    return new Response("ignored", { status: 200 });
  }

  let pro: boolean | null = null;
  if (GRANT_EVENTS.has(type)) pro = true;
  else if (REVOKE_EVENTS.has(type)) pro = false;
  else return new Response("ignored", { status: 200 }); // ex: BILLING_ISSUE, CANCELLATION (ainda ativo até expirar)

  const tx = await FirestoreTransaction.begin();
  const writes: any[] = [];
  tx.upsert("settings", uid, { pro }, writes);
  await tx.commit(writes);

  return new Response("ok", { status: 200 });
}