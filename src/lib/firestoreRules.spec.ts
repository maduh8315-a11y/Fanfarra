import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "fanfarra-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("regras do Firestore — obras (works)", () => {
  it("bloqueia criar obra sem estar autenticado", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.collection("works").add({ uid: "user-a", title: "X" }));
  });

  it("bloqueia criar obra em nome de outro usuário", async () => {
    const db = testEnv.authenticatedContext("user-a").firestore();
    await assertFails(db.collection("works").add({ uid: "user-b", title: "X" }));
  });

  it("permite criar obra com o próprio uid", async () => {
    const db = testEnv.authenticatedContext("user-a").firestore();
    await assertSucceeds(db.collection("works").add({ uid: "user-a", title: "X" }));
  });

  it("bloqueia ler obra privada de outro usuário", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("works").doc("obra-1").set({ uid: "user-a", isPublicRec: false });
    });
    const db = testEnv.authenticatedContext("user-b").firestore();
    await assertFails(db.collection("works").doc("obra-1").get());
  });

  it("permite ler obra marcada como recomendação pública", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("works").doc("obra-2").set({ uid: "user-a", isPublicRec: true });
    });
    const db = testEnv.authenticatedContext("user-b").firestore();
    await assertSucceeds(db.collection("works").doc("obra-2").get());
  });

  it("bloqueia excluir obra de outro usuário", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("works").doc("obra-3").set({ uid: "user-a" });
    });
    const db = testEnv.authenticatedContext("user-b").firestore();
    await assertFails(db.collection("works").doc("obra-3").delete());
  });
});

describe("regras do Firestore — metas pessoais (personal_goals)", () => {
  it("bloqueia ler a meta de outra pessoa", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("personal_goals").doc("meta-1").set({ uid: "user-a", title: "Ler 40 fanfics" });
    });
    const db = testEnv.authenticatedContext("user-b").firestore();
    await assertFails(db.collection("personal_goals").doc("meta-1").get());
  });

  it("permite o dono editar o progresso da própria meta", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("personal_goals").doc("meta-2").set({ uid: "user-a", progress: 0 });
    });
    const db = testEnv.authenticatedContext("user-a").firestore();
    await assertSucceeds(db.collection("personal_goals").doc("meta-2").update({ progress: 1 }));
  });
});

describe("regras do Firestore — denúncia de perfil (reports)", () => {
  it("bloqueia se reporterUid não for o próprio usuário logado", async () => {
    const db = testEnv.authenticatedContext("user-a").firestore();
    await assertFails(
      db.collection("reports").add({ reporterUid: "user-b", targetUid: "user-c", reason: "spam" }),
    );
  });

  it("bloqueia denunciar o próprio perfil (auto-denúncia)", async () => {
    const db = testEnv.authenticatedContext("user-a").firestore();
    await assertFails(
      db.collection("reports").add({ reporterUid: "user-a", targetUid: "user-a", reason: "spam" }),
    );
  });

  it("permite denunciar o perfil de outra pessoa", async () => {
    const db = testEnv.authenticatedContext("user-a").firestore();
    await assertSucceeds(
      db.collection("reports").add({ reporterUid: "user-a", targetUid: "user-b", reason: "spam" }),
    );
  });

  it("bloqueia um usuário comum de LER denúncias (só admin pode)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("reports").doc("r1").set({ reporterUid: "user-a", targetUid: "user-b" });
    });
    const db = testEnv.authenticatedContext("user-a").firestore();
    await assertFails(db.collection("reports").doc("r1").get());
  });
});

// Cobre a regra de content_reports (denúncias de recomendação/comentário,
// lidas pelo painel admin em moderationStore.ts). Antes dessa regra existir
// em firestore.rules, o Firestore negava tudo por padrão — nem o admin
// conseguia ler. Esses testes garantem que isso não volte a acontecer.
describe("regras do Firestore — content_reports", () => {
  it("permite o admin ler content_reports", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("app_config/admins").set({ uids: ["admin-1"] });
      await ctx.firestore().collection("content_reports").doc("cr1").set({ reason: "spam" });
    });
    const db = testEnv.authenticatedContext("admin-1").firestore();
    await assertSucceeds(db.collection("content_reports").doc("cr1").get());
  });

  it("bloqueia um usuário comum de ler content_reports", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("app_config/admins").set({ uids: ["admin-1"] });
      await ctx.firestore().collection("content_reports").doc("cr1").set({ reason: "spam" });
    });
    const db = testEnv.authenticatedContext("user-comum").firestore();
    await assertFails(db.collection("content_reports").doc("cr1").get());
  });

  it("permite qualquer usuário autenticado criar uma denúncia", async () => {
    const db = testEnv.authenticatedContext("user-a").firestore();
    await assertSucceeds(
      db.collection("content_reports").add({ reason: "spam", reportedByUid: "user-a" }),
    );
  });
});