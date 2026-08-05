// src/lib/api/importWork/monitor.server.ts
//
// Monitoramento de saúde dos importadores (Wattpad, AO3, etc). Cada vez que
// um link reconhecido é importado, registramos se o leitor específico
// daquela plataforma funcionou ou não.
import { FirestoreTransaction } from "@/lib/googleFirestoreRest.server";

const COLLECTION = "import_monitor";

export interface ImportHealthDoc {
  source: string;
  okCount?: number;
  failCount?: number;
  lastOkAt?: number;
  lastFailAt?: number;
  lastFailUrl?: string;
}

export async function recordImportResult(source: string, ok: boolean, url: string): Promise<void> {
  if (!source) return;
  try {
    const tx = await FirestoreTransaction.begin();
    const current = await tx.get<ImportHealthDoc>(COLLECTION, source);
    const data: ImportHealthDoc = {
      source,
      okCount: (current.data.okCount ?? 0) + (ok ? 1 : 0),
      failCount: (current.data.failCount ?? 0) + (ok ? 0 : 1),
      lastOkAt: ok ? Date.now() : current.data.lastOkAt,
      lastFailAt: ok ? current.data.lastFailAt : Date.now(),
      lastFailUrl: ok ? current.data.lastFailUrl : url,
    };
    const writes: any[] = [];
    tx.upsert(COLLECTION, source, data as unknown as Record<string, unknown>, writes);
    await tx.commit(writes);
  } catch (err) {
    console.warn(`[importMonitor] Não foi possível registrar status de "${source}":`, err);
  }
}

export async function getImportHealth(): Promise<ImportHealthDoc[]> {
  const tx = await FirestoreTransaction.begin();
  const rows = await tx.listAll<ImportHealthDoc>(COLLECTION);
  tx.rollback().catch(() => {});
  return rows.map((r) => r.data).sort((a, b) => (b.failCount ?? 0) - (a.failCount ?? 0));
}