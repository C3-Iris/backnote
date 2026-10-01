import { motion } from "motion/react";
import { Check, ChevronLeft, ExternalLink, FileText, Sparkles } from "lucide-react";
import { Badge, Card, Progress, stagger } from "../components/ui";
import { useStore } from "../lib/store";
import { LESSON_KIND_LABEL } from "../lib/types";

export default function SubjectPage({ id }: { id: number }) {
  const { subjects, lessons, isDone, toggleDone, progress } = useStore();
  const subject = subjects.find((s) => s.id === id);
  if (!subject) return <p className="text-sm text-zinc-500">Не знайдено</p>;

  const list = lessons.filter((l) => l.subjectId === id).sort((a, b) => a.id - b.id);
  const p = progress(id);
  const back = subject.kind === "subject" ? "#/subjects" : "#/courses";

  return (
    <>
      <a href={back} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-900">
        <ChevronLeft size={15} /> {subject.kind === "subject" ? "Предмети" : "Курси"}
      </a>

      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-1.5">
          {subject.code && <Badge>{subject.code}</Badge>}
          {subject.year && <Badge tone="indigo">{subject.year} курс · {subject.term} сем.</Badge>}
          {subject.provider && <Badge>{subject.provider}</Badge>}
          {subject.archived && <Badge tone="amber">Архів</Badge>}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">{subject.title}</h1>
        {subject.description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">{subject.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          {subject.instructor && <span>{subject.instructor}</span>}
          {subject.ects && <span>{subject.ects} ECTS</span>}
          {subject.url && (
            <a href={subject.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-zinc-700 hover:underline">
              Сайт курсу <ExternalLink size={11} />
            </a>
          )}
        </div>
        <div className="mt-5 flex max-w-sm items-center gap-3">
          <Progress done={p.done} total={p.total} />
          <span className="text-xs tabular-nums text-zinc-500">{p.done}/{p.total}</span>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-medium text-zinc-900">Заняття</h2>
      <motion.div variants={stagger.container} initial="hidden" animate="show">
        <Card className="divide-y divide-zinc-100 overflow-hidden">
          {list.map((l) => {
            const done = isDone(l.id);
            return (
              <motion.div key={l.id} variants={stagger.item} className="flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-50/70">
                <button
                  onClick={() => toggleDone(l.id)}
                  aria-label="Позначити пройденим"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 ${done ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 hover:border-zinc-500"}`}
                >
                  {done && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                      <Check size={12} strokeWidth={3} />
                    </motion.span>
                  )}
                </button>
                <a href={`#/s/${id}/l/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-medium ${done ? "text-zinc-400 line-through decoration-zinc-300" : "text-zinc-900"}`}>{l.title}</div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {LESSON_KIND_LABEL[l.kind]} {l.number}
                      {l.heldOn ? ` · ${new Date(l.heldOn).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}` : ""}
                    </div>
                  </div>
                  {l.summary && (
                    <span title="Є конспект" className="text-zinc-400">
                      {l.summarySource === "ai" ? <Sparkles size={14} /> : <FileText size={14} />}
                    </span>
                  )}
                </a>
              </motion.div>
            );
          })}
          {list.length === 0 && <p className="px-4 py-10 text-center text-sm text-zinc-400">Занять поки немає</p>}
        </Card>
      </motion.div>
    </>
  );
}
