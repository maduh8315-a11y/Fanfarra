import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  BookOpen,
  CheckCircle2,
  Award,
  Flame,
  Lock,
  Sparkles,
  X,
  Pencil,
  Plus,
  Link2,
} from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
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
} from "@/lib/fanfarra/extras";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Meu perfil — Fanfarra" }] }),
  component: ProfilePage,
});

const MAX_BIO = 120;

function ProfilePage() {
  const nav = useNavigate();
  const profile = useProfile();
  const settings = useSettings();
  const works = useWorks();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [statusText, setStatusText] = useState(profile.statusText ?? "");
  const [tags, setTags] = useState<string[]>(profile.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>(
    profile.socialLinks ?? [],
  );

  const [pinnedIds, setPinnedIds] = useState<string[]>(
    (profile.pinnedWorks ?? []).map((w) => w.id),
  );
  const [pinnedPickerOpen, setPinnedPickerOpen] = useState(false);
  const [pinnedSearch, setPinnedSearch] = useState("");

  const pinnedWorksList = pinnedIds
    .map((id) => works.find((w) => w.id === id))
    .filter((w): w is (typeof works)[number] => Boolean(w));

  const pickerResults = works.filter((w) =>
    w.title.toLowerCase().includes(pinnedSearch.trim().toLowerCase()),
  );

  const togglePinned = (workId: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(workId)) return prev.filter((id) => id !== workId);
      if (prev.length >= 5) {
        toast.error("Você já fixou o máximo de 5 obras.");
        return prev;
      }
      return [...prev, workId];
    });
  };

  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 8) {
      toast.error("Máximo de 8 tags.");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const addSocialLink = () => {
    if (socialLinks.length >= 5) {
      toast.error("Máximo de 5 links.");
      return;
    }
    setSocialLinks([...socialLinks, { platform: "", url: "" }]);
  };
  const updateSocialLink = (i: number, patch: Partial<{ platform: string; url: string }>) => {
    setSocialLinks(socialLinks.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };
  const removeSocialLink = (i: number) => setSocialLinks(socialLinks.filter((_, idx) => idx !== i));

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await uploadCoverImage(file, "works");
      updateProfile({ coverImage: url });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar a capa.");
    }
  };
  const [selectedBadge, setSelectedBadge] = useState<{
    id: string;
    name: string;
    description: string;
    earned: boolean;
  } | null>(null);

  const stats = useMemo(() => {
    const completed = works.filter((w) => w.status === "Concluído").length;
    const rated = works.filter((w) => w.rating > 0).length;
    return { total: works.length, completed, rated, streak: profile.streakDays, pro: settings.pro };
  }, [works, profile.streakDays, settings.pro]);

  const earnedIds = useMemo(() => earnedBadges(stats), [stats]);
  const dataReady = useAppDataReady();

  useEffect(() => {
  if (!dataReady) return;
  setUsername(profile.username);
  setBio(profile.bio);
  setStatusText(profile.statusText ?? "");
  setTags(profile.tags ?? []);
  setSocialLinks(profile.socialLinks ?? []);
  setPinnedIds((profile.pinnedWorks ?? []).map((w) => w.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [dataReady]);

  const badges = useMemo(
    () =>
      ALL_BADGES.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        earned: earnedIds.includes(b.id),
      })),
    [earnedIds],
  );

  useEffect(() => {
    if (!dataReady) return;
    syncEarnedBadges(stats);
  }, [stats, dataReady]);

  const save = () => {
    updateProfile({
      username,
      bio,
      statusText,
      tags,
      socialLinks,
      pinnedWorks: pinnedWorksList.map((w) => ({
        id: w.id,
        title: w.title,
        type: w.type,
        cover: w.cover,
        status: w.status,
        rating: w.rating,
      })),
    });
    updateUserProfile({ displayName: username });
    window.history.back();
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const url = await uploadCoverImage(file, "works", { maxDimension: 320, quality: 0.8 });
      updateProfile({ avatar: url });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar a foto.");
    }
  };

  const handleBadgeClick = (b: (typeof badges)[number]) => {
    if (!b.earned) return;
    setSelectedBadge(b);
  };

  return (
    <AppShell>
      {/* ---------- CAPA ---------- */}
      <div className="relative w-full">
        <div
          className="relative h-40 w-full sm:h-52"
          style={{
            backgroundImage: profile.coverImage
              ? `url(${profile.coverImage})`
              : "linear-gradient(160deg, var(--fan-bg-2) 0%, var(--fan-red-dark) 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%)" }}
          />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
            <button
              onClick={() => window.history.back()}
              aria-label="Voltar"
              className="p-2 rounded-full transition hover:scale-105 active:scale-95"
              style={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#fff" }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-base font-semibold tracking-wide" style={{ color: "#fff" }}>
              Meu Perfil
            </h1>
            <button
              onClick={save}
              className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition hover:brightness-110 active:scale-95 shadow-md"
              style={{ backgroundColor: "var(--fan-pink)", color: "#fff" }}
            >
              Salvar
            </button>
          </div>

          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute right-3 top-16 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur transition hover:brightness-110 active:scale-95"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <Camera size={14} />
            Alterar capa
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
        </div>

        {/* ---------- AVATAR ---------- */}
        <section className="relative -mt-14 flex flex-col items-center px-4 mb-10">
          <div className="relative group">
            <div
              className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                border: "3px solid var(--fan-pink)",
                boxShadow: "0 0 0 4px var(--fan-bg), 0 0 24px -4px var(--fan-pink)",
                backgroundColor: "var(--fan-bg-3)",
              }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold" style={{ color: "var(--fan-pink-light)" }}>
                  {profile.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition"
              style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
            >
              <Camera size={22} />
              <span className="text-[11px] mt-1 font-medium">Alterar</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFile}
            />
          </div>
          <p className="mt-3 text-sm font-medium" style={{ color: "var(--fan-text-2)" }}>
            @{profile.username}
          </p>
        </section>
      </div>

{/* ---------- OBRAS FIXADAS ---------- */}
      <section className="px-4 mb-10">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold" style={{ color: "var(--fan-text-2)" }}>
            Obras favoritas fixadas
          </h2>
          <span className="text-xs" style={{ color: "var(--fan-text-3)" }}>
            {pinnedWorksList.length}/5
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {pinnedWorksList.map((w) => (
            <div key={w.id} className="relative">
              <button
                onClick={() => togglePinned(w.id)}
                aria-label={`Remover ${w.title} dos fixados`}
                className="absolute -top-1.5 -right-1.5 z-10 rounded-full p-1 transition hover:scale-110"
                style={{ backgroundColor: "var(--fan-bg)", color: "#fff", border: "1px solid var(--fan-border)" }}
              >
                <X size={11} />
              </button>
              <div
                className="aspect-[2/3] w-full overflow-hidden rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--fan-bg-3)", border: "1px solid var(--fan-border)" }}
              >
                {w.cover ? (
                  <img src={w.cover} alt={w.title} className="h-full w-full object-cover" />
                ) : (
                  <MediaIcon type={w.type} size={22} />
                )}
              </div>
              <p className="mt-1 truncate text-[11px]" style={{ color: "var(--fan-text-2)" }}>
                {w.title}
              </p>
            </div>
          ))}

          {pinnedWorksList.length < 5 && (
            <button
              onClick={() => setPinnedPickerOpen(true)}
              className="aspect-[2/3] w-full rounded-lg flex flex-col items-center justify-center gap-1 transition hover:brightness-110 active:scale-95"
              style={{ backgroundColor: "var(--fan-bg-2)", border: "1px dashed var(--fan-border)", color: "var(--fan-text-3)" }}
            >
              <Plus size={18} />
              <span className="text-[10px] font-medium">Fixar obra</span>
            </button>
          )}
        </div>
        {pinnedWorksList.length === 0 && (
          <p className="mt-2 px-1 text-[11px]" style={{ color: "var(--fan-text-3)" }}>
            Escolha até 5 obras pra aparecerem em destaque no topo do seu perfil.
          </p>
        )}
      </section>

      {/* ---------- INFO CARD ---------- */}
      <section className="px-4 mb-10">
        <div
          className="rounded-2xl p-5 space-y-5"
          style={{
            backgroundColor: "var(--fan-bg-2)",
            border: "1px solid var(--fan-border)",
            boxShadow: "0 4px 20px -8px rgba(0,0,0,0.5)",
          }}
        >
          <div>
            <label
              className="block text-xs font-semibold mb-2 tracking-wide uppercase"
              style={{ color: "var(--fan-text-3)" }}
            >
              Nome de usuário
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition focus:ring-2"
              style={{
                backgroundColor: "var(--fan-bg-3)",
                border: "1px solid var(--fan-border)",
                color: "var(--fan-text)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-2 tracking-wide uppercase"
              style={{ color: "var(--fan-text-3)" }}
            >
              E-mail
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={profile.email}
                readOnly
                className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none cursor-not-allowed"
                style={{
                  backgroundColor: "var(--fan-bg-3)",
                  border: "1px solid var(--fan-border)",
                  color: "var(--fan-text-2)",
                }}
              />
              <button
                onClick={() => nav({ to: "/settings" })}
                className="px-3 py-2.5 rounded-lg text-xs font-semibold transition hover:brightness-110 active:scale-95 flex items-center gap-1"
                style={{
                  backgroundColor: "var(--fan-active-chip)",
                  color: "var(--fan-pink-light)",
                  border: "1px solid var(--fan-border)",
                }}
              >
                <Pencil size={12} />
                Alterar
              </button>
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-2 tracking-wide uppercase"
              style={{ color: "var(--fan-text-3)" }}
            >
              Bio curta
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none transition"
              style={{
                backgroundColor: "var(--fan-bg-3)",
                border: "1px solid var(--fan-border)",
                color: "var(--fan-text)",
              }}
            />
            <div className="flex justify-end mt-1">
              <span className="text-[11px]" style={{ color: "var(--fan-text-3)" }}>
                {bio.length}/{MAX_BIO}
              </span>
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-2 tracking-wide uppercase"
              style={{ color: "var(--fan-text-3)" }}
            >
              Status atual (opcional)
            </label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value.slice(0, 60))}
              placeholder="Ex: Assistindo Twin Peaks pela 3ª vez"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition"
              style={{
                backgroundColor: "var(--fan-bg-3)",
                border: "1px solid var(--fan-border)",
                color: "var(--fan-text)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-2 tracking-wide uppercase"
              style={{ color: "var(--fan-text-3)" }}
            >
              Tags de interesse
            </label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                    style={{
                      backgroundColor: "var(--fan-tag)",
                      color: "var(--fan-text-2)",
                      border: "1px solid var(--fan-border)",
                    }}
                  >
                    {t}
                    <button onClick={() => removeTag(t)} aria-label={`Remover ${t}`}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Ex: Suspense, Terror, Cult..."
                className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none transition"
                style={{
                  backgroundColor: "var(--fan-bg-3)",
                  border: "1px solid var(--fan-border)",
                  color: "var(--fan-text)",
                }}
              />
              <button
                onClick={addTag}
                className="px-3 py-2.5 rounded-lg text-xs font-semibold transition hover:brightness-110 active:scale-95 flex items-center gap-1"
                style={{
                  backgroundColor: "var(--fan-active-chip)",
                  color: "var(--fan-pink-light)",
                  border: "1px solid var(--fan-border)",
                }}
              >
                <Plus size={12} />
                Adicionar
              </button>
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-2 tracking-wide uppercase"
              style={{ color: "var(--fan-text-3)" }}
            >
              Redes sociais
            </label>
            <div className="space-y-2">
              {socialLinks.map((link, i) => (
                <div
                  key={i}
                  className="rounded-lg p-2.5 space-y-2"
                  style={{ backgroundColor: "var(--fan-bg-3)", border: "1px solid var(--fan-border)" }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link.platform}
                      onChange={(e) => updateSocialLink(i, { platform: e.target.value })}
                      placeholder="Instagram"
                      className="flex-1 min-w-0 px-3 py-2 rounded-md text-sm outline-none transition"
                      style={{
                        backgroundColor: "var(--fan-bg-2)",
                        border: "1px solid var(--fan-border)",
                        color: "var(--fan-text)",
                      }}
                    />
                    <button
                      onClick={() => removeSocialLink(i)}
                      aria-label="Remover link"
                      className="shrink-0 p-2 rounded-md transition hover:brightness-110 active:scale-95"
                      style={{ backgroundColor: "var(--fan-bg-2)", border: "1px solid var(--fan-border)", color: "var(--fan-text-3)" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateSocialLink(i, { url: e.target.value })}
                    placeholder="https://instagram.com/seu_usuario"
                    className="w-full px-3 py-2 rounded-md text-sm outline-none transition"
                    style={{
                      backgroundColor: "var(--fan-bg-2)",
                      border: "1px solid var(--fan-border)",
                      color: "var(--fan-text)",
                    }}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={addSocialLink}
              className="mt-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold transition hover:brightness-110 active:scale-95 flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: "var(--fan-active-chip)",
                color: "var(--fan-pink-light)",
                border: "1px dashed var(--fan-border)",
              }}
            >
              <Link2 size={13} />
              Adicionar rede social
            </button>
          </div>
        </div>
      </section>

      {/* ---------- STATS ---------- */}
      <section className="px-4 mb-10">
        <h2 className="text-sm font-semibold mb-3 px-1" style={{ color: "var(--fan-text-2)" }}>
          Estatísticas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<BookOpen size={18} />} label="Obras" value={stats.total} accent="var(--fan-icon-blue)" />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            label="Concluídos"
            value={stats.completed}
            accent="var(--fan-pink-light)"
          />
          <StatCard icon={<Award size={18} />} label="Selos" value={earnedIds.length} accent="var(--fan-gold)" />
          <StatCard icon={<Flame size={18} />} label="Dias streak" value={stats.streak} accent="var(--fan-pink)" />
        </div>
      </section>

      {/* ---------- BADGES ---------- */}
      <section className="px-4 mb-10">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Sparkles size={16} style={{ color: "var(--fan-gold)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--fan-text-2)" }}>
            Selos conquistados
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {badges.map((b) => (
            <button
              key={b.id}
              onClick={() => handleBadgeClick(b)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 p-2 transition ${
                b.earned ? "hover:scale-105 active:scale-95" : "cursor-default"
              }`}
              style={{
                backgroundColor: b.earned ? "var(--fan-bg-2)" : "var(--fan-bg-3)",
                border: `1px solid ${b.earned ? "var(--fan-border)" : "transparent"}`,
                opacity: b.earned ? 1 : 0.4,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: b.earned ? "var(--fan-gold-bg)" : "var(--fan-bg-2)",
                  color: b.earned ? "var(--fan-gold)" : "var(--fan-text-3)",
                }}
              >
                <Award size={16} />
              </div>
              <span
                className="text-[10px] font-medium text-center leading-tight line-clamp-2"
                style={{ color: "var(--fan-text-2)" }}
              >
                {b.name}
              </span>
              {!b.earned && (
                <div
                  className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--fan-bg)", color: "var(--fan-text-3)" }}
                >
                  <Lock size={9} />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- MODAL ---------- */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
          onClick={() => setSelectedBadge(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl p-6 relative"
            style={{
              backgroundColor: "var(--fan-bg-2)",
              border: "1px solid var(--fan-border)",
              boxShadow: "0 20px 60px -10px rgba(0,0,0,0.7)",
            }}
          >
            <button
              onClick={() => setSelectedBadge(null)}
              aria-label="Fechar"
              className="absolute top-3 right-3 p-1 rounded-full transition hover:scale-110"
              style={{ color: "var(--fan-text-3)" }}
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "var(--fan-active-chip)", boxShadow: "0 0 30px -6px var(--fan-pink)" }}
              >
                <Award size={36} style={{ color: "var(--fan-gold)" }} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--fan-text)" }}>
                {selectedBadge.name}
              </h3>
              <p className="text-sm mb-6" style={{ color: "var(--fan-text-2)" }}>
                {selectedBadge.description}
              </p>
              <button
                onClick={() => setSelectedBadge(null)}
                className="w-full py-2.5 rounded-full text-sm font-semibold transition hover:brightness-110 active:scale-95"
                style={{ backgroundColor: "var(--fan-pink)", color: "#fff" }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- MODAL: FIXAR OBRA ---------- */}
      {pinnedPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
          onClick={() => setPinnedPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-t-2xl p-5 sm:rounded-2xl"
            style={{
              backgroundColor: "var(--fan-bg-2)",
              border: "1px solid var(--fan-border)",
              boxShadow: "0 20px 60px -10px rgba(0,0,0,0.7)",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--fan-text)" }}>
                Fixar obra ({pinnedWorksList.length}/5)
              </h3>
              <button onClick={() => setPinnedPickerOpen(false)} aria-label="Fechar" style={{ color: "var(--fan-text-3)" }}>
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={pinnedSearch}
              onChange={(e) => setPinnedSearch(e.target.value)}
              placeholder="Buscar na sua biblioteca..."
              className="mb-3 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: "var(--fan-bg-3)", border: "1px solid var(--fan-border)", color: "var(--fan-text)" }}
            />
            <div className="flex-1 space-y-1.5 overflow-y-auto">
              {pickerResults.length === 0 ? (
                <p className="py-8 text-center text-xs" style={{ color: "var(--fan-text-3)" }}>
                  Nenhuma obra encontrada.
                </p>
              ) : (
                pickerResults.map((w) => {
                  const isPinned = pinnedIds.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => togglePinned(w.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:brightness-110"
                      style={{
                        backgroundColor: isPinned ? "var(--fan-active-chip)" : "var(--fan-bg-3)",
                        border: `1px solid ${isPinned ? "var(--fan-pink)" : "var(--fan-border)"}`,
                      }}
                    >
                      <div
                        className="flex h-10 w-8 shrink-0 items-center justify-center overflow-hidden rounded"
                        style={{ backgroundColor: "var(--fan-bg)" }}
                      >
                        {w.cover ? (
                          <img src={w.cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <MediaIcon type={w.type} size={16} />
                        )}
                      </div>
                      <span className="flex-1 truncate text-xs" style={{ color: "var(--fan-text)" }}>
                        {w.title}
                      </span>
                      {isPinned && <CheckCircle2 size={16} style={{ color: "var(--fan-pink-light)" }} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 transition hover:-translate-y-0.5 hover:brightness-110"
      style={{
        background: "linear-gradient(150deg, var(--fan-bg-2) 0%, var(--fan-bg-3) 100%)",
        border: "1px solid var(--fan-border)",
        boxShadow: "0 4px 14px -6px rgba(0,0,0,0.5)",
      }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: accent }}>
        {icon}
        <span className="text-xs font-medium" style={{ color: "var(--fan-text-3)" }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color: "var(--fan-text)" }}>
        {value}
      </div>
    </div>
  );
}