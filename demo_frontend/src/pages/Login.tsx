import { motion } from "motion/react";
import { BookOpen, Send } from "lucide-react";
import { useState } from "react";
import { Avatar, Button } from "../components/ui";
import { useStore, type LoginResult } from "../lib/store";

const MESSAGES: Record<Exclude<LoginResult, "ok">, string> = {
  requested: "Запит на доступ надіслано адміну. Після підтвердження зможеш увійти.",
  pending: "Твій запит ще розглядається адміном.",
  blocked: "Доступ для цього акаунта закрито.",
};

export default function Login() {
  const { login, users } = useStore();
  const [id, setId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = (value: string) => {
    const n = Number(value.trim());
    if (!Number.isInteger(n) || n <= 0) return setMsg("Введи числовий Telegram ID.");
    const res = login(n);
    setMsg(res === "ok" ? null : MESSAGES[res]);
  };

  const demo = users.filter((u) => u.status === "active");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.08),transparent)]" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/10">
            <BookOpen size={20} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Backnote</h1>
          <p className="mt-1 text-sm text-zinc-500">Приватна база знань для навчання</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <Button variant="primary" className="h-10 w-full bg-[#229ED9] hover:bg-[#1e8fc4]" onClick={() => submit(id)}>
            <Send size={15} /> Увійти через Telegram
          </Button>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(id)}
            inputMode="numeric"
            placeholder="Telegram ID (демо)"
            className="mt-3 h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
          />
          {msg && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {msg}
            </motion.p>
          )}

          <div className="mt-5 border-t border-zinc-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Демо-акаунти</p>
            <div className="space-y-1">
              {demo.map((u) => (
                <button key={u.id} onClick={() => submit(String(u.id))} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-zinc-50">
                  <Avatar name={u.fullName} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-800">{u.fullName}</div>
                    <div className="text-xs text-zinc-400">{u.id}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-zinc-400">Сесія запам'ятовується на 30 днів</p>
      </motion.div>
    </div>
  );
}
