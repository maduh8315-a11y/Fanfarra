import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signOut, useAuthUser } from "@/lib/fanfarra/auth";
import { updateProfile, useAppDataReady, useProfile } from "@/lib/fanfarra/extras";
import { calculateAge } from "@/lib/fanfarra/contentGate";

// Abaixo desta idade, o e-mail de um responsável é obrigatório.
// (Mesma regra do cadastro por e-mail. Se quiser pedir só de menores de 12, troque 18 por 12.)
const GUARDIAN_EMAIL_BELOW_AGE = 18;

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const pad = (n: number) => String(n).padStart(2, "0");

const fieldStyle: React.CSSProperties = {
  background: "var(--fan-bg-2)",
  border: "1px solid var(--fan-rose-mid)",
  color: "var(--fan-text)",
};

// Tela que bloqueia o app até a pessoa informar a data de nascimento.
// Aparece para quem entrou com o Google (que não passa pelo cadastro por
// e-mail) e para contas antigas que nunca informaram a idade.
export function AgeGate() {
  const user = useAuthUser();
  const ready = useAppDataReady();
  const profile = useProfile();
  const navigate = useNavigate();

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // O perfil "padrão" (ainda não carregado) usa este e-mail fictício.
  // Só mostramos a tela quando o perfil REAL da pessoa já chegou do Firestore.
  const hasRealProfile = !!profile.email && profile.email !== "fan@fanfarra.app";
  if (!user || !ready || !hasRealProfile || profile.birthDate) return null;

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => thisYear - i);

  const birthDate = day && month && year ? `${year}-${pad(Number(month))}-${pad(Number(day))}` : "";
  const age = calculateAge(birthDate || undefined);
  const needsGuardian = age !== null && age < GUARDIAN_EMAIL_BELOW_AGE;

  async function handleSave() {
    if (!birthDate || age === null || age < 0 || age > 120) {
      setError("Informe uma data de nascimento válida.");
      return;
    }
    if (needsGuardian) {
      const email = guardianEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Informe o e-mail de um responsável válido.");
        return;
      }
      if (email === (user?.email ?? "").trim().toLowerCase()) {
        setError("O e-mail do responsável precisa ser diferente do e-mail da sua conta.");
        return;
      }
    }
    setError("");
    setSaving(true);
    try {
      // O perfil público (conta infantil, perfil privado etc.) é atualizado
      // sozinho a partir destes campos, igual no cadastro por e-mail.
      await updateProfile({
        birthDate,
        needsParentalSupervision: age < 12,
        ...(needsGuardian ? { guardianEmail: guardianEmail.trim().toLowerCase() } : {}),
      });
    } catch (err) {
      console.error("Erro ao salvar data de nascimento:", err);
      toast.error("Não foi possível salvar. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    signOut();
    navigate({ to: "/login" });
  }

  const selectClass = "w-full px-3 py-3.5 text-sm rounded-[10px] outline-none";

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto px-6"
      style={{
        background: "var(--fan-bg)",
        paddingTop: "calc(2.5rem + var(--sat))",
        paddingBottom: "calc(2.5rem + var(--sab))",
      }}
    >
      <div className="mx-auto max-w-sm">
        <h1 className="text-xl font-bold" style={{ color: "var(--fan-text)" }}>
          Só mais uma coisa
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--fan-text-2)" }}>
          Precisamos da sua data de nascimento para deixar o Fanfarra seguro e adequado à sua idade.
          Ela não aparece para outras pessoas.
        </p>

        <label className="block text-sm mt-6 mb-1.5" style={{ color: "var(--fan-text-2)" }}>
          Data de nascimento <span style={{ color: "#F87171" }}>*</span>
        </label>
        <div className="flex gap-2">
          <select
            aria-label="Dia"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={selectClass}
            style={{ ...fieldStyle, flex: "0 0 24%" }}
          >
            <option value="">Dia</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            aria-label="Mês"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={selectClass}
            style={{ ...fieldStyle, flex: "1 1 auto" }}
          >
            <option value="">Mês</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            aria-label="Ano"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className={selectClass}
            style={{ ...fieldStyle, flex: "0 0 28%" }}
          >
            <option value="">Ano</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {age !== null && age < 13 && age >= 0 && (
          <p className="mt-2 text-sm" style={{ color: "var(--fan-text-2)" }}>
            Menores de 13 anos usam o Fanfarra com a supervisão de um responsável.
          </p>
        )}

        {needsGuardian && (
          <div className="mt-4">
            <label className="block text-sm mb-1.5" style={{ color: "var(--fan-text-2)" }}>
              E-mail de um responsável <span style={{ color: "#F87171" }}>*</span>
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="responsavel@email.com"
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              className="w-full px-3.5 py-3.5 text-sm rounded-[10px] outline-none"
              style={fieldStyle}
            />
            <p className="mt-1.5 text-sm" style={{ color: "var(--fan-text-2)" }}>
              Precisa ser diferente do e-mail da sua conta.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm" style={{ color: "#F87171" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="fan-btn-primary w-full flex items-center justify-center"
          style={{ height: 50, fontSize: 15, marginTop: 24 }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" color="white" /> : "Continuar"}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-4 text-sm"
          style={{ color: "var(--fan-text-2)" }}
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}