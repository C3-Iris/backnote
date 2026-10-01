import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Avatar, Badge, Button, Card, PageHeader } from "../components/ui";
import { useStore } from "../lib/store";

export default function Admin() {
  const { users, setStatus, addUser, removeUser } = useStore();
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  const pending = users.filter((u) => u.status === "pending");
  const members = users.filter((u) => u.status !== "pending");

  const submit = () => {
    const n = Number(id.trim());
    if (!Number.isInteger(n) || n <= 0) return;
    addUser(n, name.trim());
    setId("");
    setName("");
  };

  return (
    <>
      <PageHeader title="Учасники" subtitle="Керування доступом до бази" />

      <AnimatePresence initial={false}>
        {pending.length > 0 && (
          <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
            <h2 className="mb-3 text-sm font-medium text-zinc-900">Запити на доступ <Badge tone="amber">{pending.length}</Badge></h2>
            <Card className="divide-y divide-zinc-100">
              {pending.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={u.fullName} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-900">{u.fullName}</div>
                    <div className="text-xs text-zinc-400">{u.username ? `@${u.username} · ` : ""}{u.id}</div>
                  </div>
                  <Button variant="primary" onClick={() => setStatus(u.id, "active")}><Check size={14} /> Прийняти</Button>
                  <Button variant="ghost" onClick={() => removeUser(u.id)} aria-label="Відхилити"><X size={14} /></Button>
                </div>
              ))}
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Додати за Telegram ID</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" placeholder="Telegram ID" className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100" />
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Ім'я (необов'язково)" className="h-9 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100" />
          <Button variant="primary" onClick={submit}><Plus size={14} /> Додати</Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Учасники ({members.length})</h2>
        <Card className="divide-y divide-zinc-100">
          <AnimatePresence initial={false}>
            {members.map((u) => (
              <motion.div key={u.id} layout exit={{ opacity: 0 }} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={u.fullName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate text-sm font-medium text-zinc-900">
                    {u.fullName}
                    {u.isAdmin && <Badge tone="indigo">Адмін</Badge>}
                    {u.status === "blocked" && <Badge tone="red">Заблоковано</Badge>}
                  </div>
                  <div className="text-xs text-zinc-400">{u.username ? `@${u.username} · ` : ""}{u.id}</div>
                </div>
                {!u.isAdmin && (
                  <>
                    <Button variant="ghost" onClick={() => setStatus(u.id, u.status === "blocked" ? "active" : "blocked")}>
                      {u.status === "blocked" ? "Розблокувати" : "Заблокувати"}
                    </Button>
                    <Button variant="danger" onClick={() => removeUser(u.id)} aria-label="Видалити"><Trash2 size={14} /></Button>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </Card>
      </section>
    </>
  );
}
