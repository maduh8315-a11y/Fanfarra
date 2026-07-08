import { useState } from "react";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { AuthInput } from "@/components/fanfarra/auth/AuthInput";
import {
  authErrorMessage,
  changeUserEmail,
  changeUserPassword,
  deleteUserAccount,
  useAuthUser,
} from "@/lib/fanfarra/auth";

// ─── Wrapper compartilhado (bottom sheet) ──────────────────────────────────
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl p-5"
        style={{ background: "var(--fan-bg)", border: "0.5px solid var(--fan-rose-mid)" }}
      >
        <div className="flex justify-center mb-3">
          <span className="block w-8 h-1 rounded-full" style={{ background: "var(--fan-rose-mid)" }} />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold" style={{ color: "var(--fan-text)" }}>
            {title}
          </h2>
          <button onClick={onClose} aria-label="Fechar">
            <X size={20} color="var(--fan-text-2)" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Alterar e-mail ─────────────────────────────────────────────────────────
export function ChangeEmailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuthUser();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;
  const isGoogle = user?.provider === "google";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail) return setError("Informe o novo e-mail.");
    if (!isGoogle && !password) return setError("Informe sua senha atual.");
    setError(undefined);
    setLoading(true);
    try {
      await changeUserEmail(newEmail, password);
      setSent(true);
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code ?? ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Alterar e-mail" onClose={onClose}>
      {sent ? (
        <div className="text-center py-4">
          <p className="text-[13px]" style={{ color: "var(--fan-text)" }}>
            Enviamos um link de confirmação para <strong>{newEmail}</strong>.
          </p>
          <p className="text-[12px] mt-2" style={{ color: "var(--fan-text-2)" }}>
            Abra o e-mail e clique no link para concluir a troca. Seu e-mail atual continua valendo
            até você confirmar.
          </p>
          <button
            onClick={onClose}
            className="fan-btn-primary w-full mt-5"
            style={{ height: 46, fontSize: 14 }}
          >
            Entendi
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-[12px] mb-1" style={{ color: "var(--fan-text-2)" }}>
            E-mail atual: {user?.email}
          </p>
          <AuthInput
            label="Novo e-mail"
            type="email"
            autoComplete="email"
            placeholder="novo@email.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          {!isGoogle && (
            <AuthInput
              label="Senha atual"
              type="password"
              togglePassword
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {isGoogle && (
            <p className="text-[11px]" style={{ color: "var(--fan-text-2)" }}>
              Sua conta usa login do Google — vamos pedir para confirmar com o Google antes de
              trocar o e-mail.
            </p>
          )}
          {error && (
            <p className="text-[12px]" style={{ color: "#F87171" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="fan-btn-primary w-full flex items-center justify-center"
            style={{ height: 46, fontSize: 14, marginTop: 8 }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" color="white" />
            ) : (
              "Enviar confirmação"
            )}
          </button>
        </form>
      )}
    </ModalShell>
  );
}

// ─── Alterar senha ──────────────────────────────────────────────────────────
export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) return setError("Informe sua senha atual.");
    if (newPassword.length < 6) return setError("A nova senha precisa ter ao menos 6 caracteres.");
    if (newPassword !== confirmPassword) return setError("As senhas não coincidem.");
    setError(undefined);
    setLoading(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      setDone(true);
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code ?? ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Alterar senha" onClose={onClose}>
      {done ? (
        <div className="text-center py-4">
          <p className="text-[13px]" style={{ color: "var(--fan-text)" }}>
            Senha alterada com sucesso! 🎉
          </p>
          <button
            onClick={onClose}
            className="fan-btn-primary w-full mt-5"
            style={{ height: 46, fontSize: 14 }}
          >
            Fechar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <AuthInput
            label="Senha atual"
            type="password"
            togglePassword
            autoComplete="current-password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <AuthInput
            label="Nova senha"
            type="password"
            togglePassword
            autoComplete="new-password"
            placeholder="Mín. 6 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <AuthInput
            label="Confirmar nova senha"
            type="password"
            togglePassword
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && (
            <p className="text-[12px]" style={{ color: "#F87171" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="fan-btn-primary w-full flex items-center justify-center"
            style={{ height: 46, fontSize: 14, marginTop: 8 }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" color="white" />
            ) : (
              "Salvar nova senha"
            )}
          </button>
        </form>
      )}
    </ModalShell>
  );
}

// ─── Excluir conta ──────────────────────────────────────────────────────────
export function DeleteAccountModal({
  open,
  onClose,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const user = useAuthUser();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  if (!open) return null;
  const isGoogle = user?.provider === "google";
  const canSubmit = confirmText.trim().toUpperCase() === "EXCLUIR" && (isGoogle || password);

  async function handleDelete() {
    if (!canSubmit) return;
    setError(undefined);
    setLoading(true);
    try {
      await deleteUserAccount(password);
      onDeleted();
    } catch (err) {
      setError(authErrorMessage((err as { code?: string })?.code ?? ""));
      setLoading(false);
    }
  }

  return (
    <ModalShell title="Excluir conta" onClose={onClose}>
      <div
        className="flex items-start gap-2 p-3 rounded-[10px] mb-4"
        style={{ background: "#2A0008", border: "1px solid #5C0018" }}
      >
        <AlertTriangle size={18} color="#F87171" className="mt-0.5" />
        <p className="text-[12px]" style={{ color: "#FCA5A5" }}>
          Esta ação é permanente. Suas obras, estantes e votos do Awards serão apagados e não podem
          ser recuperados.
        </p>
      </div>

      <div className="space-y-3">
        {!isGoogle && (
          <AuthInput
            label="Senha atual"
            type="password"
            togglePassword
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        {isGoogle && (
          <p className="text-[11px]" style={{ color: "var(--fan-text-2)" }}>
            Sua conta usa login do Google — vamos pedir para confirmar com o Google antes de
            excluir.
          </p>
        )}
        <AuthInput
          label='Digite "EXCLUIR" para confirmar'
          type="text"
          placeholder="EXCLUIR"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
        {error && (
          <p className="text-[12px]" style={{ color: "#F87171" }}>
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={!canSubmit || loading}
          onClick={handleDelete}
          className="w-full flex items-center justify-center rounded-full"
          style={{
            height: 46,
            fontSize: 14,
            fontWeight: 700,
            marginTop: 8,
            background: canSubmit ? "#CC0022" : "var(--fan-bg-2)",
            color: canSubmit ? "white" : "var(--fan-text-2)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" color="white" />
          ) : (
            "Excluir minha conta"
          )}
        </button>
      </div>
    </ModalShell>
  );
}
