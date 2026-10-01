import { motion } from "motion/react";
import { Archive, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Card, PageHeader, Progress, stagger } from "../components/ui";
import { useStore } from "../lib/store";
import type { SubjectKind } from "../lib/types";

export default function Catalog({ kind }: { kind: SubjectKind }) {
  const { subjects, lessons, progress } = useStore();
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return subjects
      .filter((s) => s.kind === kind && s.archived === archived)
      .filter((s) => {
        if (!query) return true;
        const inLessons = lessons.some((l) => l.subjectId === s.id && (l.title + (l.summary ?? "")).toLowerCase().includes(query));
        return inLessons || `${s.title} ${s.code ?? ""} ${s.provider ?? ""}`.toLowerCase().includes(query);
      })
      // найновіший семестр зверху, як у боті
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.term ?? 0) - (a.term ?? 0));
  }, [subjects, lessons, kind, archived, q]);

  const isSubj = kind === "subject";

  return (
    <>
      <PageHeader title={isSubj ? "Предмети" : "Курси"} subtitle={isSubj ? "Університетські дисципліни" : "Онлайн-курси та додаткові треки"} />

      <div className="mb-5 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук за назвою, уроками, конспектами…"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
          />
        </div>
        <button
          onClick={() => setArchived((a) => !a)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition ${archived ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"}`}
        >
          <Archive size={14} /> Архів
        </button>
      </div>

      <motion.div key={`${kind}${archived}`} variants={stagger.container} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => {
          const p = progress(s.id);
          return (
            <motion.a key={s.id} variants={stagger.item} href={`#/s/${s.id}`} whileHover={{ y: -2 }} className="block">
              <Card className="h-full p-4 transition hover:border-zinc-300 hover:shadow-md">
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.code && <Badge>{s.code}</Badge>}
                  {s.year && <Badge tone="indigo">{s.year} курс · {s.term} сем.</Badge>}
                  {s.provider && <Badge>{s.provider}</Badge>}
                </div>
                <div className="mt-3 text-[15px] font-medium leading-snug text-zinc-900">{s.title}</div>
                {s.instructor && <div className="mt-0.5 text-xs text-zinc-500">{s.instructor}{s.ects ? ` · ${s.ects} ECTS` : ""}</div>}
                <div className="mt-4 flex items-center gap-3">
                  <Progress done={p.done} total={p.total} />
                  <span className="text-xs tabular-nums text-zinc-500">{p.done}/{p.total}</span>
                </div>
              </Card>
            </motion.a>
          );
        })}
      </motion.div>
      {list.length === 0 && <p className="py-16 text-center text-sm text-zinc-400">Нічого не знайдено</p>}
    </>
  );
}
