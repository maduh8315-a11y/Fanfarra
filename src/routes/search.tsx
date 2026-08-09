import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EmptyState } from "@/components/fanfarra/EmptyState";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Search as SearchIcon, SearchX, Users, UserCheck } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useWorks } from "@/lib/fanfarra/store";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";
import { CATALOG, type RecommendationItem } from "@/lib/fanfarra/recommendations";
import { CatalogCard } from "./recommendations";
import { useProfile } from "@/lib/fanfarra/extras";
import { useFriends } from "@/lib/fanfarra/friendsStore";
import { useFollowing, followUser, unfollowUser } from "@/lib/fanfarra/followStore";
import { searchUsersByUsername, type PublicProfile } from "@/lib/fanfarra/publicProfiles";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Buscar — Fanfarra" }] }),
  component: SearchPage,
});

const TABS = [
  { id: "works", label: "Obras" },
  { id: "people", label: "Pessoas" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function SearchPage() {
  const works = useWorks();
  const profile = useProfile();
  const friends = useFriends();
  const following = useFollowing();
  const [tab, setTab] = useState<TabId>("works");
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [peopleResults, setPeopleResults] = useState<PublicProfile[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // limpa o campo ao trocar de aba, pra não misturar contexto de busca
  useEffect(() => {
    setQ("");
  }, [tab]);

  // ── Busca de pessoas (debounced, igual ao /friends) ──────────────────────
  useEffect(() => {
    if (tab !== "people") return;
    const term = q.trim();
    if (!term) {
      setPeopleResults([]);
      setPeopleLoading(false);
      return;
    }
    setPeopleLoading(true);
    const timer = setTimeout(async () => {
      try {
        setPeopleResults(await searchUsersByUsername(term));
      } catch {
        toast.error("Erro ao buscar usuários.");
      } finally {
        setPeopleLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, tab]);

  // ── Busca de obras: primeiro na biblioteca, depois no catálogo (descoberta) ──
  const libraryResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return works.filter(
      (w) =>
        w.title.toLowerCase().includes(term) ||
        w.type.toLowerCase().includes(term) ||
        w.status.toLowerCase().includes(term),
    );
  }, [q, works]);

  const discoveryResults = useMemo<RecommendationItem[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const libraryTitles = new Set(works.map((w) => w.title.toLowerCase()));
    return CATALOG.filter(
      (item) =>
        !libraryTitles.has(item.title.toLowerCase()) &&
        (item.title.toLowerCase().includes(term) ||
          item.author?.toLowerCase().includes(term) ||
          item.genres?.some((g) => g.toLowerCase().includes(term))),
    ).slice(0, 24);
  }, [q, works]);

  const searchingWorks = q.trim().length > 0;
  const noWorksResults = libraryResults.length === 0 && discoveryResults.length === 0;

  return (
    <AppShell>
      <header className="px-4 pt-4 pb-3">
        <div
          id="tour-search-input"
          className="flex items-center gap-2 rounded-[10px] px-3 py-2.5"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
        >
          <SearchIcon size={18} color="var(--fan-rose-mid)" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === "works" ? "Buscar obras..." : "Buscar por @usuário..."}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--fan-text)" }}
          />
        </div>
      </header>

      <div className="px-4 pb-4">
        <div
          className="relative flex rounded-full p-1"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative flex-1 py-2.5 text-sm font-bold rounded-full transition-colors"
              style={{ color: tab === t.id ? "#fff" : "var(--fan-text-2)" }}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="search-tab-pill"
                  className="absolute inset-0 rounded-full -z-10"
                  style={{ background: "var(--fan-pink)" }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "works" ? (
        !searchingWorks ? (
          <EmptyState icon={SearchIcon} title="Busque por título, tipo, status ou descubra algo novo" />
        ) : noWorksResults ? (
          <EmptyState
            icon={SearchX}
            title="Nenhuma obra encontrada"
            action={
              <Link to="/add" search={{ title: q }} className="fan-btn-primary text-sm">
                Adicionar "{q}" como nova obra
              </Link>
            }
          />
        ) : (
          <div className="pb-8">
            {libraryResults.length > 0 && (
              <>
                <h2 className="px-4 pt-1 pb-2 text-sm font-bold" style={{ color: "var(--fan-text-2)" }}>
                  Na sua biblioteca
                </h2>
                <ul>
                  {libraryResults.map((w) => {
                    const pct =
                      w.total > 0
                        ? Math.min(100, (w.current / w.total) * 100)
                        : w.status === "Concluído"
                          ? 100
                          : 0;
                    return (
                      <li key={w.id}>
                        <Link
                          to="/work/$id"
                          params={{ id: w.id }}
                          className="flex items-center gap-3 px-4 py-3"
                          style={{
                            borderBottom: "0.5px solid var(--fan-rose-mid)",
                            background: "var(--fan-bg-2)",
                          }}
                        >
                          <div
                            className="w-11 h-[60px] rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "var(--fan-border)" }}
                          >
                            {w.cover ? (
                              <img src={w.cover} alt="" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <MediaIcon type={w.type} size={20} className="opacity-80" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate" style={{ color: "var(--fan-text-3)" }}>
                              {w.title}
                            </div>
                            <div className="text-sm" style={{ color: "var(--fan-text-2)" }}>
                              {w.type} · {w.status}
                            </div>
                            <div className="mt-1 h-[3px] rounded-full" style={{ background: "var(--fan-border)" }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: "var(--fan-pink)" }}
                              />
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {discoveryResults.length > 0 && (
              <>
                <h2 className="px-4 pt-5 pb-3 text-sm font-bold" style={{ color: "var(--fan-text-2)" }}>
                  Descobrir
                </h2>
                <div className="px-4 grid grid-cols-3 gap-3">
                  {discoveryResults.map((item) => (
                    <CatalogCard key={item.id} item={item} grid />
                  ))}
                </div>
              </>
            )}
          </div>
        )
      ) : q.trim().length === 0 ? (
        <EmptyState icon={Users} title="Busque por @usuário para encontrar pessoas" />
      ) : peopleLoading ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--fan-text-2)" }}>
          Buscando...
        </p>
      ) : peopleResults.length === 0 ? (
        <EmptyState icon={SearchX} title="Nenhum usuário encontrado" />
      ) : (
        <ul className="px-4 space-y-2 pb-8">
          {peopleResults.map((r) => {
            const isFriend = friends.some((f) => f.friendUid === r.uid);
            const isFollowing = following.some((f) => f.followingUid === r.uid);
            return (
              <li
                key={r.uid}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]"
                style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
              >
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                    style={{ background: "var(--fan-red-dark)", color: "var(--fan-icon-blue)" }}
                  >
                    {(r.username ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <Link to="/u/$username" params={{ username: r.username }} className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: "var(--fan-text)" }}>
                    {r.username}
                  </div>
                </Link>

                {isFriend && (
                  <span className="text-xs flex items-center gap-1" style={{ color: "var(--fan-text-2)" }}>
                    <UserCheck size={14} /> Amigos
                  </span>
                )}

                <button
                  onClick={async () => {
                    try {
                      if (isFollowing) await unfollowUser(r.uid);
                      else await followUser(r.uid, r.username, profile.username);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Erro ao seguir.");
                    }
                  }}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: "var(--fan-active-chip)",
                    color: isFollowing ? "var(--fan-pink-light)" : "var(--fan-text-2)",
                    border: isFollowing ? "0.5px solid var(--fan-pink)" : "none",
                  }}
                >
                  {isFollowing ? "Seguindo" : "Seguir"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}