import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { EmptyState } from "@/components/fanfarra/EmptyState";
import { useChatList } from "@/lib/fanfarra/chatStore";
import { usePublicProfile } from "@/lib/fanfarra/publicProfiles";

export const Route = createFileRoute("/chat")({
    head: () => ({ meta: [{ title: "Mensagens — Fanfarra" }] }),
    component: ChatInboxPage,
});

function formatChatTime(ts?: number): string {
    if (!ts) return "";
    const diffMs = Date.now() - ts;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `${min}min`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(ts).toLocaleDateString("pt-BR");
}

function ChatInboxPage() {
    const nav = useNavigate();
    const chats = useChatList();

    return (
        <AppShell>
            <header className="flex items-center gap-3 px-4 pt-4 pb-3">
                <button onClick={() => nav({ to: "/" })} aria-label="Voltar">
                    <ArrowLeft size={22} color="var(--fan-text-2)" />
                </button>
                <h1 id="tour-chat-title" className="text-lg font-bold" style={{ color: "var(--fan-text)" }}>
                    Mensagens
                </h1>
            </header>

            {chats.length === 0 ? (
                <EmptyState
                    icon={MessageCircle}
                    title="Nenhuma conversa ainda"
                    description="Envie uma mensagem pra um amigo pra começar."
                    action={
                        <Link to="/friends" className="fan-btn-primary text-sm">
                            Ir para Amigos
                        </Link>
                    }
                />
            ) : (
                <ul className="px-4 space-y-2 pb-8">
                    {chats
                        .filter((c) => !!c.otherUid)
                        .map((c) => (
                            <ChatRow
                                key={c.id}
                                otherUid={c.otherUid}
                                lastMessage={c.lastMessage}
                                lastMessageAt={c.lastMessageAt}
                                unread={c.unread}
                            />
                        ))}
                </ul>
            )}
        </AppShell>
    );
}

function ChatRow({
    otherUid,
    lastMessage,
    lastMessageAt,
    unread,
}: {
    otherUid: string;
    lastMessage?: string;
    lastMessageAt?: number;
    unread: boolean;
}) {
    const p = usePublicProfile(otherUid);
    return (
        <li>
            <Link
                to="/chat/$uid"
                params={{ uid: otherUid }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[12px]"
                style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
            >
                {p?.avatar ? (
                    <img src={p.avatar} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                ) : (
                    <div
                        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                        style={{ background: "var(--fan-red-dark)", color: "var(--fan-icon-blue)" }}
                    >
                        {(p?.username ?? "?").slice(0, 1).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold truncate" style={{ color: "var(--fan-text)" }}>
                            {p?.username ?? "..."}
                        </span>
                        <span className="text-xs shrink-0" style={{ color: "var(--fan-text-2)" }}>
                            {formatChatTime(lastMessageAt)}
                        </span>
                    </div>
                    <p
                        className="text-sm truncate"
                        style={{ color: unread ? "var(--fan-text)" : "var(--fan-text-2)", fontWeight: unread ? 700 : 400 }}
                    >
                        {lastMessage ?? "Comecem a conversa!"}
                    </p>
                </div>
                {unread && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "var(--fan-pink)" }} />}
            </Link>
        </li>
    );
}