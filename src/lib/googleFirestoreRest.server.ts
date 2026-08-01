// src/lib/googleFirestoreRest.server.ts
//
// Cliente mínimo da API REST do Firestore, autenticado via service account.
// Existe porque o firebase-admin (gRPC) NÃO roda em Cloudflare Workers —
// isso aqui só usa fetch + Web Crypto, que funcionam no Worker normalmente.
//
// Usa a mesma FIREBASE_SERVICE_ACCOUNT_JSON do scripts/cron.mjs, só que
// registrada como secret do Worker (wrangler secret put ...).

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function base64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function getServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const availableKeys = Object.keys(process.env ?? {}).join(", ");
  if (!raw) {
    throw new Error(
      `[DIAGNOSTICO] typeof process=${typeof process} | chaves disponíveis em process.env: [${availableKeys}] | tamanho do valor lido: ${raw === undefined ? "undefined" : raw === "" ? "string vazia" : String(raw).length}`,
    );
  }
  return JSON.parse(raw);
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;

  const sa = getServiceAccount();
  const iat = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const key = await importPrivateKey(sa.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao autenticar service account: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: now + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

// ── Verificação do ID token do Firebase Auth (client → servidor) ───────────
// Usa o endpoint público do Identity Toolkit em vez de decodificar o JWT
// manualmente — é o próprio Google quem valida assinatura/expiração.
export async function verifyFirebaseIdToken(idToken: string): Promise<string> {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = (await res.json()) as { users?: { localId: string }[]; error?: { message?: string } };
  const uid = data.users?.[0]?.localId;
  if (!uid) throw new Error("Sessão inválida ou expirada. Faça login novamente.");
  return uid;
}

// ── Helpers de (de)serialização de valores do Firestore REST ───────────────
function toValue(v: unknown): unknown {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (v && typeof v === "object") return { mapValue: { fields: toFields(v as Record<string, unknown>) } };
  return { nullValue: null };
}
function fromValue(v: any): any {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(fromValue);
  if ("mapValue" in v) return fromFields(v.mapValue.fields);
  return null;
}
function toFields(obj: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toValue(v);
  return fields;
}
function fromFields(fields: Record<string, any> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields ?? {})) out[k] = fromValue(v);
  return out;
}

function projectId(): string {
  return import.meta.env.VITE_FIREBASE_PROJECT_ID;
}
function docsBase(): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;
}
function docPath(collectionName: string, id: string): string {
  return `projects/${projectId()}/databases/(default)/documents/${collectionName}/${id}`;
}

async function callFirestore(path: string, body: unknown): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${docsBase()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firestore REST error (${path}): ${await res.text()}`);
  return res.json();
}

export interface FsDoc<T> {
  exists: boolean;
  data: T;
}

export class FirestoreTransaction {
  private constructor(public readonly id: string) { }

  static async begin(): Promise<FirestoreTransaction> {
    const data = await callFirestore(":beginTransaction", { options: { readWrite: {} } });
    return new FirestoreTransaction(data.transaction);
  }

  async get<T extends Record<string, any>>(collectionName: string, id: string): Promise<FsDoc<T>> {
    const data = await callFirestore(":batchGet", {
      documents: [docPath(collectionName, id)],
      transaction: this.id,
    });
    const entry = data[0];
    if (!entry?.found) return { exists: false, data: {} as T };
    return { exists: true, data: fromFields(entry.found.fields) as T };
  }

  // Conta quantos docs de `collectionName` batem com as 3 igualdades dadas
  // (mesma consulta composta que já existia no client — mesmo índice serve).
  async countWhereEquals(collectionName: string, filters: Record<string, string>, limit: number): Promise<number> {
    const data = await callFirestore(":runQuery", {
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          compositeFilter: {
            op: "AND",
            filters: Object.entries(filters).map(([field, value]) => ({
              fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } },
            })),
          },
        },
        limit,
      },
      transaction: this.id,
    });
    return (data as any[]).filter((r) => r.document).length;
  }

  async listAll<T extends Record<string, any>>(collectionName: string, limit = 5000): Promise<{ id: string; data: T }[]> {
    const data = await callFirestore(":runQuery", {
      structuredQuery: { from: [{ collectionId: collectionName }], limit },
      transaction: this.id,
    });
    return (data as any[])
      .filter((r) => r.document)
      .map((r) => ({
        id: (r.document.name as string).split("/").pop() as string,
        data: fromFields(r.document.fields) as T,
      }));
  }

  upsert(collectionName: string, id: string, data: Record<string, unknown>, writes: any[], updateMask?: string[]) {
    writes.push({
      update: { name: docPath(collectionName, id), fields: toFields(data) },
      updateMask: { fieldPaths: updateMask ?? Object.keys(data) },
    });
  }
  del(collectionName: string, id: string, writes: any[]) {
    writes.push({ delete: docPath(collectionName, id) });
  }

  async commit(writes: any[]): Promise<void> {
    await callFirestore(":commit", { writes, transaction: this.id });
  }

  async rollback(): Promise<void> {
    try {
      await callFirestore(":rollback", { transaction: this.id });
    } catch {
      // best-effort — transação expira sozinha em ~60s de qualquer jeito
    }
  }
}