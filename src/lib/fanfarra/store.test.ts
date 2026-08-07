import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockCollection = vi.fn(() => ({}));
const mockDocRef = { id: "obra-gerada-123" };
const mockDoc = vi.fn(() => mockDocRef);

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
}));

// currentUser é mutável entre testes pra simular usuário logado/deslogado
const mockAuth: { currentUser: { uid: string } | null } = { currentUser: null };
vi.mock("./firebase", () => ({
  auth: mockAuth,
  db: {},
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("addWork (fluxo de adicionar obra)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = null;
  });

  it("recusa adicionar obra sem usuário autenticado", async () => {
    const { addWork } = await import("./store");
    expect(() =>
      addWork({
        title: "Minha Fanfic",
        type: "Fanfic",
        status: "Lendo",
      } as any),
    ).toThrow("Usuário não autenticado.");
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("salva a obra no Firestore com uid, createdAt e updatedAt quando o usuário está logado", async () => {
    mockAuth.currentUser = { uid: "uid-do-usuario" };
    const { addWork } = await import("./store");

    const antes = Date.now();
    const obra = addWork({
      title: "Minha Fanfic",
      type: "Fanfic",
      status: "Lendo",
    } as any);
    const depois = Date.now();

    expect(obra.id).toBe("obra-gerada-123");
    expect(obra.createdAt).toBeGreaterThanOrEqual(antes);
    expect(obra.createdAt).toBeLessThanOrEqual(depois);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, dadosSalvos] = mockSetDoc.mock.calls[0];
    expect(dadosSalvos.uid).toBe("uid-do-usuario");
    expect(dadosSalvos.title).toBe("Minha Fanfic");
    expect(dadosSalvos.createdAt).toBe(dadosSalvos.updatedAt);
  });

  it("remove campos 'undefined' antes de salvar (Firestore rejeita undefined)", async () => {
    mockAuth.currentUser = { uid: "uid-do-usuario" };
    const { addWork } = await import("./store");

    addWork({
      title: "Minha Fanfic",
      type: "Fanfic",
      status: "Lendo",
      coverUrl: undefined,
    } as any);

    const [, dadosSalvos] = mockSetDoc.mock.calls[0];
    expect("coverUrl" in dadosSalvos).toBe(false);
  });
});
