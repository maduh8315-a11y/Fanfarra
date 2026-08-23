// src/lib/api/publicProfileSeo.functions.ts
// Busca os dados públicos mínimos de um perfil só pra montar os metadados
// de SEO/Open Graph da página /u/$username no SERVIDOR, antes do HTML ser
// enviado. Usa a service account (mesmo padrão de listBannedUsers.functions.ts),
// por isso funciona mesmo pra visitante anônimo/crawler — Googlebot nunca
// faz login no app, então a leitura via SDK client (que exige auth) não
// serviria aqui.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FirestoreTransaction } from "@/lib/googleFirestoreRest.server";

const inputSchema = z.object({ username: z.string().min(1) });

export interface PublicProfileSeoData {
  username: string;
  bio?: string;
  avatar?: string;
  isPrivate?: boolean;
}

export const getPublicProfileSeoServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<PublicProfileSeoData | null> => {
    const tx = await FirestoreTransaction.begin();
    try {
      const results = await tx.query<{
        username: string;
        usernameLower: string;
        bio?: string;
        avatar?: string;
        isPrivate?: boolean;
      }>("public_profiles", {
        where: [{ field: "usernameLower", op: "EQUAL", value: data.username.toLowerCase() }],
        limit: 1,
      });
      await tx.rollback(); // só leitura

      const found = results[0]?.data;
      if (!found) return null;

      return {
        username: found.username,
        bio: found.bio,
        avatar: found.avatar,
        isPrivate: found.isPrivate,
      };
    } catch {
      await tx.rollback();
      return null;
    }
  });