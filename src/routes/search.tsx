import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon, SearchX } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { useWorks } from "@/lib/fanfarra/store";
import { MediaIcon } from "@/components/fanfarra/MediaIcon";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Buscar — Fanfarra" }] }),
  component: SearchPage,
});

function SearchPage() {
  const works = useWorks();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return works.filter(
      (w) =>
        w.title.toLowerCase().includes(term) ||
        w.type.toLowerCase().includes(term) ||
        w.status.toLowerCase().includes(term),
    );
  }, [q, works]);

  return (
    <AppShell>
      <header className="px-4 pt-4 pb-3">
        <div
          className="flex items-center gap-2 rounded-[10px] px-3 py-2.5"
          style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-rose-mid)" }}
        >
          <SearchIcon size={18} color="var(--fan-rose-mid)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar na biblioteca..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--fan-text)" }}
          />
        </div>
      </header>

      {!q.trim() ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <SearchIcon size={48} color="var(--fan-rose-mid)" />
          <p className="mt-4 text-[13px]" style={{ color: "var(--fan-text-2)" }}>
            Busque por título, tipo ou status
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <SearchX size={48} color="var(--fan-rose-mid)" />
          <p className="mt-4 text-[13px]" style={{ color: "var(--fan-text-2)" }}>
            Nenhuma obra encontrada
          </p>
          <Link to="/add" className="fan-btn-primary mt-5 text-xs">
            Adicionar "{q}" como nova obra
          </Link>
        </div>
      ) : (
        <ul className="mt-2">
          {results.map((w) => {
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
                      <MediaIcon type={w.type} size={20} className="opacity-50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[13px] font-bold truncate"
                      style={{ color: "var(--fan-text-3)" }}
                    >
                      {w.title}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--fan-text-2)" }}>
                      {w.type} · {w.status}
                    </div>
                    <div
                      className="mt-1 h-[3px] rounded-full"
                      style={{ background: "var(--fan-border)" }}
                    >
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
      )}
    </AppShell>
  );
}
