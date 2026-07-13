import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { ClientOnly } from "@/components/fanfarra/ClientOnly";
import { WorkForm, formValuesToWork, workToFormValues } from "@/components/fanfarra/forms/WorkForm";
import { deleteWork, updateWork, useWork } from "@/lib/fanfarra/store";
import { getShelvesForWork } from "@/lib/fanfarra/bookcaseStore";

export const Route = createFileRoute("/work_/$id/edit")({
  head: () => ({ meta: [{ title: "Editar obra — Fanfarra" }] }),
  component: EditWork,
});

function EditWork() {
  const { id } = Route.useParams();
  const work = useWork(id);
  const nav = useNavigate();

  if (!work) {
    return (
      <AppShell>
        <div className="p-10 text-center" style={{ color: "var(--fan-text-2)" }}>
          Obra não encontrada.
        </div>
      </AppShell>
    );
  }

  const existingShelfEntries = getShelvesForWork(work.id);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => nav({ to: "/work/$id", params: { id } })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
          Editar {work.type}
        </h1>
        <span className="w-6" />
      </header>

      <ClientOnly>
        <WorkForm
          type={work.type}
          initial={workToFormValues(work, existingShelfEntries)}
          submitLabel="Salvar alterações"
          workId={work.id}
          onSubmit={(v) => {
            updateWork(work.id, formValuesToWork(work.type, v));
            nav({ to: "/work/$id", params: { id } });
          }}
          onDelete={async () => {
            try {
              await deleteWork(work.id);
              nav({ to: "/library" });
            } catch {
              // erro já mostrado via toast dentro de deleteWork
            }
          }}
        />
      </ClientOnly>
    </AppShell>
  );
}
