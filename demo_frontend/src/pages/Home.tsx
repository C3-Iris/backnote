import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Flame, Layers } from "lucide-react";
import { Badge, Card, PageHeader, Progress, stagger } from "../components/ui";
import { useStore } from "../lib/store";
import { LESSON_KIND_LABEL } from "../lib/types";

export default function Home() {
  const { me, subjects, lessons, isDone, progress } = useStore();
  const active = subjects.filter((s) => !s.archived);
  const total = lessons.filter((l) => active.some((s) => s.id === l.subjectId));
  const done = total.filter((l) => isDone(l.id)).length;

  const next = active
    .map((s) => ({ s, l: lessons.filter((l) => l.subjectId === s.id).find((l) => !isDone(l.id)) }))
    .find((x) => x.l);

  const stats = [
    { icon: CheckCircle2, label: "Пройдено", value: `${done}/${total.length}` },
    { icon: Layers, label: "Активних предметів", value: String(active.length) },
    { icon: Flame, label: "Загальний прогрес", value: `${total.length ? Math.round((done / total.length) * 100) : 0}%` },
  ];

  return (
    <>
      <PageHeader title={`Привіт, ${me?.fullName.split(" ")[0]} 👋`} subtitle="Ось твій прогрес на сьогодні" />

      <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={stagger.item} className="grid gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label} className="p-4">
              <s.icon size={16} className="text-zinc-400" />
              <div className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">{s.value}</div>
              <div className="text-xs text-zinc-500">{s.label}</div>
            </Card>
          ))}
        </motion.div>

        {next && next.l && (
          <motion.a variants={stagger.item} href={`#/s/${next.s.id}/l/${next.l.id}`} className="group block">
            <Card className="flex items-center justify-between gap-4 p-5 transition group-hover:border-zinc-300 group-hover:shadow-md">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Продовжити</div>
                <div className="mt-1 truncate text-base font-medium text-zinc-900">{next.l.title}</div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
                  <Badge>{LESSON_KIND_LABEL[next.l.kind]} {next.l.number}</Badge>
                  <span className="truncate">{next.s.title}</span>
                </div>
              </div>
              <ArrowRight size={18} className="shrink-0 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-zinc-900" />
            </Card>
          </motion.a>
        )}

        <motion.div variants={stagger.item}>
          <h2 className="mb-3 text-sm font-medium text-zinc-900">Прогрес за предметами</h2>
          <Card className="divide-y divide-zinc-100">
            {active.map((s) => {
              const p = progress(s.id);
              return (
                <a key={s.id} href={`#/s/${s.id}`} className="flex items-center gap-4 px-4 py-3 transition hover:bg-zinc-50/70">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-800">{s.title}</div>
                    <Progress done={p.done} total={p.total} className="mt-2" />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums text-zinc-500">{p.done}/{p.total}</span>
                </a>
              );
            })}
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
