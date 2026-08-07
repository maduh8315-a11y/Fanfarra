import { describe, it, expect, vi, beforeEach } from "vitest";

// auth.ts importa vários outros stores só por causa de deleteUserAccount().
// Como o fluxo testado aqui é o de CRIAR CONTA, esses módulos são
// mockados como stubs vazios pra não precisar inicializar Firebase de verdade.
vi.mock("./nominationsStore", () => ({ deleteNominationsAndReactionsForUser: vi.fn() }));
vi.mock("./store", () => ({ deleteAllWorksForUser: vi.fn() }));
vi.mock("./bookcaseStore", () => ({ deleteAllBookcasesForUser: vi.fn() }));
vi.mock("./awardsStore", () => ({ deleteAwardVotesForUser: vi.fn() }));
vi.mock("./communityStore", () => ({ deleteAllRecommendationsForUser: vi.fn() }));
vi.mock("./extras", () => ({
  deleteRemainingUserData: vi.fn(),
  setSkipNextProfileAutoSeed: vi.fn(),
}));
vi.mock("./purchases", () => ({
  initPurchases: vi.fn().mockResolvedValue(undefined),
  logOutPurchases: vi.fn().mockResolvedValue(undefined),
}));

const mockCreateUserWithEmailAndPassword = vi.fn();
const mockUpdateProfile = vi.fn().mockResolvedValue(undefined);
const mockSendEmailVerification = vi.fn().mockResolvedValue(undefined);
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDoc = vi.fn((...args: unknown[]) => ({ path: args.join("/") }));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUserWithEmailAndPassword(...args),
  signInWithPopup: vi.fn(),
  signInWithCredential: vi.fn(),
  GoogleAuthProvider: { credential: vi.fn() },
  EmailAuthProvider: { credential: vi.fn() },
  reauthenticateWithCredential: vi.fn(),
  reauthenticateWithPopup: vi.fn(),
  verifyBeforeUpdateEmail: vi.fn(),
  updatePassword: vi.fn(),
  deleteUser: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

vi.mock("./firebase", () => ({
  auth: {},
  db: {},
}));

describe("signUpWithEmail (fluxo de criar conta)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: {
        uid: "novo-uid",
        email: "pessoa@exemplo.com",
        displayName: "Pessoa",
        photoURL: null,
        emailVerified: false,
        providerData: [],
        metadata: { creationTime: undefined },
      },
    });
  });

  it("cria a conta, define o displayName e salva o perfil no Firestore", async () => {
    const { signUpWithEmail } = await import("./auth");

    const user = await signUpWithEmail(
      "  Pessoa@Exemplo.com  ",
      "  senha123  ",
      "Pessoa",
      "2000-05-20",
    );

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      "pessoa@exemplo.com",
      "senha123",
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "novo-uid" }),
      { displayName: "Pessoa" },
    );
    expect(mockSetDoc).toHaveBeenCalled();
    expect(mockSendEmailVerification).toHaveBeenCalled();
    expect(user.uid).toBe("novo-uid");
  });

  it("marca needsParentalSupervision = true para menores de 12 anos", async () => {
    const { signUpWithEmail } = await import("./auth");
    const hoje = new Date();
    const nascimentoCrianca = `${hoje.getFullYear() - 8}-01-01`;

    await signUpWithEmail("crianca@exemplo.com", "senha123", "Crianca", nascimentoCrianca);

    const [, profileData] = mockSetDoc.mock.calls[0];
    expect(profileData.needsParentalSupervision).toBe(true);
  });

  it("NÃO marca needsParentalSupervision para adultos", async () => {
    const { signUpWithEmail } = await import("./auth");

    await signUpWithEmail("adulto@exemplo.com", "senha123", "Adulto", "1990-01-01");

    const [, profileData] = mockSetDoc.mock.calls[0];
    expect(profileData.needsParentalSupervision).toBe(false);
  });

  it("propaga o erro do Firebase quando o e-mail já está em uso", async () => {
    const { signUpWithEmail } = await import("./auth");
    const err = Object.assign(new Error("in use"), { code: "auth/email-already-in-use" });
    mockCreateUserWithEmailAndPassword.mockRejectedValueOnce(err);

    await expect(
      signUpWithEmail("existente@exemplo.com", "senha123", "Existente", "1990-01-01"),
    ).rejects.toThrow("in use");
  });
});

describe("authErrorMessage", () => {
  it("traduz os códigos de erro mais comuns de login/cadastro", async () => {
    const { authErrorMessage } = await import("./auth");
    expect(authErrorMessage("auth/wrong-password")).toBe("E-mail ou senha incorretos.");
    expect(authErrorMessage("auth/email-already-in-use")).toBe("Este e-mail já está em uso.");
    expect(authErrorMessage("auth/weak-password")).toBe("Senha muito fraca (mín. 6 caracteres).");
    expect(authErrorMessage("auth/too-many-requests")).toBe(
      "Muitas tentativas. Aguarde um pouco e tente de novo.",
    );
  });

  it("cai numa mensagem genérica pra códigos desconhecidos", async () => {
    const { authErrorMessage } = await import("./auth");
    expect(authErrorMessage("algum-codigo-nunca-visto")).toBe("Ocorreu um erro. Tente novamente.");
  });
});
