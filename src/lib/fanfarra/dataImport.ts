// src/lib/fanfarra/dataImport.ts
// Restaura um backup gerado pelo "Baixar meus dados" (dataExport.ts).
// Roda 100% no client, sempre gravando por cima da conta logada no momento
// (nunca usa o uid que está dentro do arquivo — evita restaurar dados na
// conta errada por engano).
import { doc, setDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";

interface ExportedPayload {
  perfil?: Record<string, unknown> | null;
  configuracoes?: Record<string, unknown> | null;
  biblioteca?: Array<Record<string, unknown> & { id: string }>;
  metasPessoais?: Array<Record<string, unknown> & { id: string }>;
  estantes?: Array<Record<string, unknown> & { id: string }>;
}

export interface ImportSummary {
  perfil: boolean;
  configuracoes: boolean;
  biblioteca: number;
  metasPessoais: number;
  estantes: number;
}

function readFileAsJson(file: File): Promise<ExportedPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error("Esse arquivo não é um backup válido do Fanfarra (JSON inválido)."));
      }
    };
    reader.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    reader.readAsText(file);
  });
}

// Grava uma lista de documentos (obras, metas ou estantes) na conta atual,
// sempre forçando o uid pra ser o do usuário logado agora — mesmo que o
// backup tenha sido exportado de outra conta. Usa o MESMO id do backup, então
// reimportar o mesmo arquivo duas vezes não duplica nada, só sobrescreve.
async function restoreCollection(
  collectionName: string,
  items: Array<Record<string, unknown> & { id: string }> | undefined,
  uid: string,
): Promise<number> {
  if (!items || items.length === 0) return 0;

  const BATCH_LIMIT = 400; // margem de segurança abaixo do limite de 500 do Firestore
  let restored = 0;

  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const { id, ...data } = item;
      batch.set(doc(db, collectionName, id), { ...data, uid }, { merge: true });
    }
    await batch.commit();
    restored += chunk.length;
  }

  return restored;
}

export async function importMyData(file: File): Promise<ImportSummary> {
  const user = auth.currentUser;
  if (!user) throw new Error("Você precisa estar logado para importar seus dados.");
  const uid = user.uid;

  const payload = await readFileAsJson(file);

  if (!payload || typeof payload !== "object") {
    throw new Error("Esse arquivo não é um backup válido do Fanfarra.");
  }

  const summary: ImportSummary = {
    perfil: false,
    configuracoes: false,
    biblioteca: 0,
    metasPessoais: 0,
    estantes: 0,
  };

  if (payload.perfil) {
    await setDoc(doc(db, "profiles", uid), payload.perfil, { merge: true });
    summary.perfil = true;
  }

  if (payload.configuracoes) {
    // "pro" nunca é restaurado pelo client — continua só liberável pelo servidor.
    const { pro: _pro, ...configSemPro } = payload.configuracoes as { pro?: unknown };
    await setDoc(doc(db, "settings", uid), { ...configSemPro, pro: false }, { merge: true });
    summary.configuracoes = true;
  }

  summary.biblioteca = await restoreCollection("works", payload.biblioteca, uid);
  summary.metasPessoais = await restoreCollection("personal_goals", payload.metasPessoais, uid);
  summary.estantes = await restoreCollection("bookcases", payload.estantes, uid);

  return summary;
}