import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/fanfarra/AppShell";
import { EmptyState } from "@/components/fanfarra/EmptyState";
import { useProfile } from "@/lib/fanfarra/extras";
import { useAuthUser } from "@/lib/fanfarra/auth";
import { useIsFriend, useIsBlockedByMe, useAmIBlockedBy } from "@/lib/fanfarra/friendsStore";
import { usePublicProfile } from "@/lib/fanfarra/publicProfiles";
import {
  chatIdFor,
  useChatMessages,
  sendChatMessage,
  markChatRead,
  setTyping,
  useOtherTyping,
  usePresence,
  type ChatMessage,
} from "@/lib/fanfarra/chatStore";

export const Route = createFileRoute("/chat_/$uid")({
  head: () => ({ meta: [{ title: "Conversa — Fanfarra" }] }),
  component: ChatPage,
});

function formatLastSeen(ts: number): string {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return new Date(ts).toLocaleDateString("pt-BR");
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatDayLabel(ts: number): string {
  const now = Date.now();
  if (isSameDay(ts, now)) return "Hoje";
  if (isSameDay(ts, now - 24 * 60 * 60 * 1000)) return "Ontem";
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function ChatPage() {
  const { uid: otherUid } = Route.useParams();

  if (!otherUid) {
    return (
      <AppShell>
        <header className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button onClick={() => nav({ to: "/chat" })} aria-label="Voltar">
            <ArrowLeft size={22} color="var(--fan-text-2)" />
          </button>
        </header>
        <EmptyState
          icon={MessageCircle}
          title="Não foi possível abrir esta conversa"
          description="Os dados dessa conversa estão incompletos. Tente removê-la e começar de novo."
        />
      </AppShell>
    );
  }

  const nav = useNavigate();
  const me = useAuthUser();
  const profile = useProfile();
  const other = usePublicProfile(otherUid);
  const isFriend = useIsFriend(otherUid);
  const isBlockedByMe = useIsBlockedByMe(otherUid);
  const amIBlocked = useAmIBlockedBy(otherUid);
  const chatId = me ? chatIdFor(me.uid, otherUid) : "";
  const messages = useChatMessages(chatId);
  const isOtherTyping = useOtherTyping(chatId, otherUid);
  const presence = usePresence(otherUid);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Avisa a outra pessoa que parou de digitar ao sair da tela
  useEffect(() => {
    return () => {
      if (chatId) setTyping(chatId, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [chatId]);

  function handleTextChange(value: string) {
    setText(value);
    if (!chatId) return;
    setTyping(chatId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(chatId, false), 3000);
  }

  useEffect(() => {
    if (chatId) markChatRead(chatId);
  }, [chatId, messages.length]);

  // Assim que a mensagem "de verdade" chega do servidor, some com a versão otimista.
  useEffect(() => {
    if (pending.length === 0) return;
    setPending((p) =>
      p.filter(
        (pm) =>
          !messages.some(
            (m) =>
              m.senderUid === pm.senderUid &&
              m.text === pm.text &&
              Math.abs(m.createdAt - pm.createdAt) < 15000,
          ),
      ),
    );
  }, [messages]);

  const displayMessages = [...messages, ...pending].sort((a, b) => a.createdAt - b.createdAt);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || !me) return;
    setSending(true);
    setText("");
    if (chatId) {
      setTyping(chatId, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      senderUid: me.uid,
      senderUsername: profile.username,
      text: trimmed,
      createdAt: Date.now(),
    };
    setPending((p) => [...p, optimisticMsg]);

    try {
      await sendChatMessage(otherUid, other?.username ?? "", profile.username, trimmed);
    } catch (err) {
      setPending((p) => p.filter((m) => m.id !== optimisticMsg.id));
      setText(trimmed);
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  if (!isFriend) {
    const title = amIBlocked
      ? "Esta conversa não está disponível"
      : isBlockedByMe
        ? "Você bloqueou este usuário"
        : "Vocês precisam ser amigos para conversar";
    const description = amIBlocked
      ? "Vocês não são mais amigos."
      : isBlockedByMe
        ? "Desbloqueie na tela de perfil dele(a) para voltar a conversar."
        : "Envie um pedido de amizade primeiro.";
    return (
      <AppShell>
        <header className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button onClick={() => nav({ to: "/friends" })} aria-label="Voltar">
            <ArrowLeft size={22} color="var(--fan-text-2)" />
          </button>
        </header>
        <EmptyState
          icon={MessageCircle}
          title={title}
          description={description}
          action={
            amIBlocked || isBlockedByMe ? undefined : (
              <Link to="/friends" className="fan-btn-primary text-sm">
                Ir para Amigos
              </Link>
            )
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 sticky top-0 z-10" style={{ background: "var(--fan-bg)" }}>
        <button onClick={() => nav({ to: "/friends" })} aria-label="Voltar">
          <ArrowLeft size={22} color="var(--fan-text-2)" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate" style={{ color: "var(--fan-text)" }}>
            {other?.username ?? "..."}
          </div>
          <div className="text-xs truncate" style={{ color: "var(--fan-pink-light)" }}>
            {isOtherTyping
              ? "digitando..."
              : presence.online
                ? "online agora"
                : presence.lastActiveAt
                  ? `visto por último ${formatLastSeen(presence.lastActiveAt)}`
                  : ""}
          </div>
        </div>
      </header>

      <div className="px-4 pb-32 flex flex-col gap-2">
        {displayMessages.length === 0 ? (
          <EmptyState icon={MessageCircle} title="Comecem a conversa!" description="Fale sobre a última obra que vocês curtiram." />
        ) : (
          displayMessages.map((m, i) => {
            const mine = m.senderUid === me?.uid;
            const prevMsg = displayMessages[i - 1];
            const showDaySeparator = !prevMsg || !isSameDay(prevMsg.createdAt, m.createdAt);
            return (
              <div key={m.id}>
                {showDaySeparator && (
                  <div className="flex justify-center my-2">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "var(--fan-bg-2)", color: "var(--fan-text-2)" }}
                    >
                      {formatDayLabel(m.createdAt)}
                    </span>
                  </div>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[75%] px-3 py-2 rounded-2xl text-sm"
                    style={{
                      background: mine ? "var(--fan-pink)" : "var(--fan-bg-2)",
                      color: mine ? "#fff" : "var(--fan-text)",
                      border: mine ? "none" : "0.5px solid var(--fan-border)",
                      opacity: m.id.startsWith("temp-") ? 0.6 : 1,
                    }}
                  >
                    <div>{m.text}</div>
                    <div
                      className="text-[10px] text-right mt-1"
                      style={{ color: mine ? "rgba(255,255,255,0.7)" : "var(--fan-text-3)" }}
                    >
                      {formatMessageTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isOtherTyping && (
          <div className="flex justify-start">
            <div
              className="flex items-center gap-1 px-3 py-2.5 rounded-2xl"
              style={{ background: "var(--fan-bg-2)", border: "0.5px solid var(--fan-border)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--fan-text-2)" }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--fan-text-2)", animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--fan-text-2)", animationDelay: "0.3s" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        className="fixed left-0 right-0 flex items-center gap-2 px-4 py-3 z-40"
        style={{ bottom: "calc(5.25rem + var(--sab))", background: "var(--fan-bg)", borderTop: "0.5px solid var(--fan-border)" }}
      >
        <input
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Escreva uma mensagem..."
          className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
          style={{ background: "var(--fan-bg-2)", color: "var(--fan-text)", border: "0.5px solid var(--fan-border)" }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--fan-pink)", opacity: sending || !text.trim() ? 0.5 : 1 }}
          aria-label="Enviar"
        >
          <Send size={16} color="#fff" />
        </button>
      </div>
    </AppShell>
  );
}