// src/lib/api/purgeAccount.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  verifyFirebaseIdToken,
  queryDocPaths,
  listAllDocPaths,
  deleteDocsBatch,
} from "@/lib/googleFirestoreRest.server";

const inputSchema = z.object({ idToken: z.string().min(1) });

// Roda com a service account (ignora firestore.rules) e limpa as partes da
// conta que o client NÃO tem permissão de apagar sozinho:
// - chats onde o usuário é membro, incluindo todas as mensagens de cada um
// - follows nas duas direções (seguindo / seguido)
// - blocks feitos POR OUTRAS PESSOAS contra este usuário (o client só pode
//   apagar bloqueios que ELE MESMO criou — ver firestore.rules)
export const purgeRemainingAccountDataServer = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data }): Promise<void> => {
    const uid = await verifyFirebaseIdToken(data.idToken);

    // chats + mensagens
    const chatPaths = await queryDocPaths("chats", {
      field: "members",
      op: "ARRAY_CONTAINS",
      value: uid,
    });
    for (const chatPath of chatPaths) {
      const chatId = chatPath.split("/").pop()!;
      const messagePaths = await listAllDocPaths("messages", `chats/${chatId}`);
      await deleteDocsBatch(messagePaths);
    }
    await deleteDocsBatch(chatPaths);

    // follows (as duas direções)
    const [following, followedBy] = await Promise.all([
      queryDocPaths("follows", { field: "followerUid", op: "EQUAL", value: uid }),
      queryDocPaths("follows", { field: "followingUid", op: "EQUAL", value: uid }),
    ]);
    await deleteDocsBatch([...following, ...followedBy]);

    // blocks feitos por outras pessoas contra este uid
    const blockedAgainst = await queryDocPaths("blocks", {
      field: "blockedUid",
      op: "EQUAL",
      value: uid,
    });
    await deleteDocsBatch(blockedAgainst);
  });