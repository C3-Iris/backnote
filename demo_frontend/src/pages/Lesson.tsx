import { ArrowLeft, ArrowRight, Check, ChevronLeft, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Markdown } from "../components/Markdown";
import { Badge, Button, Card } from "../components/ui";
import { useStore } from "../lib/store";
import { LESSON_KIND_LABEL } from "../lib/types";

export default function LessonPage({ subjectId, lessonId }: { subjectId: number; lessonId: number }) {
  const { subjects, lessons, isDone, toggleDone, getNote, setNote } = useStore();
  const subject = subjects.find((s) => s.id === subjectId);
  const siblings = lessons.filter((l) => l.subjectId === subjectId).sort((a, b) => a.id - b.id);
  const idx = siblings.findIndex((l) => l.id === lessonId);
  const lesson = siblings[idx];

  const [note, setLocal] = useState(() => getNote(lessonId));
  const [saved, setSaved] = useState(false);

  // нотатка зберігається автоматично з невеликою затримкою
  useEffect(() => {
    setLocal(getNote(lessonId));
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    if (note === getNote(lessonId)) return;
    const t = setTimeout(() => {
      setNote(lessonId, note);
      setSaved(true);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  if (!subject || !lesson) return <p className="text-sm text-zinc-500">Не знайдено</p>;

  const done = isDone(lesson.id);
  const prev = siblings[idx - 1];
  const next = siblings[idx + 1];

  return (
    <div className="mx-auto max-w-2xl">
      <a href={`#/s/${subjectId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-900">
        <ChevronLeft size={15} /> {subject.title}
      </a>

      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge>{LESSON_KIND_LABEL[lesson.kind]} {lesson.number}</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">{lesson.title}</h1>
          {lesson.heldOn && (
            <p className="mt-1 text-xs text-zinc-400">{new Date(lesson.heldOn).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })}</p>
          )}
        </div>
        <Button variant={done ? "secondary" : "primary"} onClick={() => toggleDone(lesson.id)} className="shrink-0">
          <Check size={14} /> {done ? "Пройдено" : "Позначити"}
        </Button>
      </div>

      {lesson.description && <p className="mt-4 text-sm leading-relaxed text-zinc-600">{lesson.description}</p>}

      {lesson.videoUrl && (
        <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="group mt-5 block">
          <Card className="flex items-center gap-3 p-3 transition group-hover:border-zinc-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white transition group-hover:scale-105">
              <Play size={15} fill="currentColor" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-zinc-900">Запис заняття</div>
              <div className="text-xs text-zinc-400">Відкрити відео</div>
            </div>
          </Card>
        </a>
      )}

      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-medium text-zinc-900">Конспект</h2>
          {lesson.summary && (
            <Badge tone={lesson.summarySource === "ai" ? "indigo" : "zinc"}>
              {lesson.summarySource === "ai" && <Sparkles size={10} />} {lesson.summarySource === "ai" ? "Gemini" : "Вручну"}
            </Badge>
          )}
        </div>
        <Card className="p-5">
          {lesson.summary ? <Markdown source={lesson.summary} /> : <p className="text-sm text-zinc-400">Конспекту ще немає. Додай його в боті — тут він з'явиться автоматично.</p>}
        </Card>
      </section>

      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-900">Мої нотатки</h2>
          <span className={`text-xs text-zinc-400 transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>Збережено</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => {
            setLocal(e.target.value);
            setSaved(false);
          }}
          rows={5}
          placeholder="Приватні нотатки бачиш лише ти…"
          className="w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 text-sm outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
        />
      </section>

      <div className="mt-8 flex justify-between gap-3">
        {prev ? (
          <a href={`#/s/${subjectId}/l/${prev.id}`}><Button><ArrowLeft size={14} /> Назад</Button></a>
        ) : <span />}
        {next && <a href={`#/s/${subjectId}/l/${next.id}`}><Button>Далі <ArrowRight size={14} /></Button></a>}
      </div>
    </div>
  );
}
