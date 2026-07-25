import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, User } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { Field, TextInput, TextareaField } from "@/components/fanfarra/forms/FormFields";
import { useWorks } from "@/lib/fanfarra/store";
import { uploadCoverImage } from "@/lib/fanfarra/uploadImage";
import { updateUserProfile } from "@/lib/fanfarra/auth";
import { toast } from "sonner";
import {
  ALL_BADGES,
  earnedBadges,
  syncEarnedBadges,
  updateProfile,
  useAppDataReady,
  useProfile,
  useSettings,
  type Badge,
} from "@/lib/fanfarra/extras";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Meu perfil — Fanfarra" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const nav = useNavigate();
  const profile = useProfile();
  const settings = useSettings();
  const works = useWorks();
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const stats = useMemo(() => {
    const completed = works.filter((w) => w.status === "Concluído").length;
    const rated = works.filter((w) => w.rating > 0).length;
    return { total: works.length, completed, rated, streak: profile.streakDays, pro: settings.pro };
  }, [works, profile.streakDays, settings.pro]);

  const earnedIds = useMemo(() => earnedBadges(stats), [stats]);
  const dataReady = useAppDataReady();

  // Efeito colateral (salvar selo novo + notificar) roda separado do render.
  useEffect(() => {
    if (!dataReady) return;
    syncEarnedBadges(stats);
  }, [stats, dataReady]);

  const save = () => {
    updateProfile({ username, bio });
    updateUserProfile({ displayName: username });
    window.history.back();
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => window.history.back()} aria-label="Voltar">
          {" "}
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Meu perfil
        </h1>
        <button onClick={save} className="text-[14px]" style={{ color: "var(--fan-pink)" }}>
          Salvar
        </button>
      </header>

      <div className="flex flex-col items-center mt-2 mb-4">
        <label className="cursor-pointer group relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
            style={{ background: "var(--fan-red-dark)" }}
          >
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={36} color="var(--fan-icon-blue)" />
            )}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <span className="text-sm font-bold text-white">Alterar</span>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const url = await uploadCoverImage(file, "works");
                updateProfile({ avatar: url });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erro ao enviar a foto.");
              }
            }}
          />
        </label>
        <span className="mt-2 text-sm" style={{ color: "var(--fan-pink-light)" }}>
          Alterar foto
        </span>
      </div>

      <div className="px-4 space-y-4">
        <Field label="Nome de usuário">
          <TextInput value={username} onChange={setUsername} />
        </Field>
        <Field label="E-mail">
          <div
            className="w-full rounded-[10px] px-3 py-3 text-sm flex items-center justify-between"
            style={{
              background: "var(--fan-bg-2)",
              border: "0.5px solid var(--fan-rose-mid)",
              color: "var(--fan-text-2)",
            }}
          >
            <span>{profile.email}</span>
            <Link
              to="/settings"
              className="text-sm font-semibold"
              style={{ color: "var(--fan-pink)" }}
            >
              Alterar
            </Link>
          </div>
        </Field>
        <Field label="Bio curta">
          <TextareaField value={bio} onChange={setBio} maxLength={120} rows={3} />
        </Field>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Stat n={stats.total} label="Obras" />
          <Stat n={stats.completed} label="Concluídos" />
          <Stat n={earnedIds.length} label="Selos" />
          <Stat n={stats.streak} label="Dias streak" />
        </div>

        <h3 className="text-sm font-bold mt-4" style={{ color: "var(--fan-text-3)" }}>
          Selos conquistados
        </h3>
        <div className="grid grid-cols-4 gap-3 pb-8">
          {ALL_BADGES.map((b) => {
            const earned = earnedIds.includes(b.id);
            return (
              <button
                key={b.id}
                onClick={() => earned && setSelectedBadge(b)}
                className="flex flex-col items-center gap-1"
                style={{ opacity: earned ? 1 : 0.5 }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                  style={{
                    background: earned ? "var(--fan-active-chip)" : "var(--fan-bg-2)",
                    border: `1px solid ${earned ? "var(--fan-pink)" : "var(--fan-border)"}`,
                  }}
                >
                  <b.Icon size={20} />
                </div>
                <span className="text-sm text-center" style={{ color: "var(--fan-text-2)" }}>
                  {b.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelectedBadge(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-5 text-center"
            style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-pink)" }}
          >
            <div className="text-4xl mb-2"><selectedBadge.Icon size={36} /></div>
            <h3 className="text-base font-bold" style={{ color: "var(--fan-text)" }}>
              {selectedBadge.name}
            </h3>
            <p className="text-sm mt-2" style={{ color: "var(--fan-text-2)" }}>
              {selectedBadge.description}
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div
      className="rounded-[10px] p-3 text-center"
      style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
    >
      <div className="text-[22px] font-bold" style={{ color: "var(--fan-pink-light)" }}>
        {n}
      </div>
      <div className="text-sm" style={{ color: "var(--fan-text-2)" }}>
        {label}
      </div>
    </div>
  );
}
