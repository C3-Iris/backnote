import { Check } from "lucide-react";
import type { ReactNode } from "react";

// Крихітний рендерер: заголовки, списки, чекліст, **жирний**, `код`.
// Для повного Markdown пізніше можна підключити react-markdown.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={i} className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800">{part.slice(1, -1)}</code>;
    return part;
  });
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];

  const flush = () => {
    if (list.length) {
      out.push(<ul key={`ul${out.length}`} className="my-3 space-y-1.5">{list}</ul>);
      list = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const task = line.match(/^- \[( |x)\] (.*)/);
    if (task) {
      const checked = task[1] === "x";
      list.push(
        <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700">
          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}>
            {checked && <Check size={11} strokeWidth={3} />}
          </span>
          <span>{inline(task[2])}</span>
        </li>,
      );
      return;
    }
    if (line.startsWith("- ")) {
      list.push(
        <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
          <span>{inline(line.slice(2))}</span>
        </li>,
      );
      return;
    }
    flush();
    if (line.startsWith("### ")) out.push(<h4 key={i} className="mb-1 mt-5 text-sm font-semibold text-zinc-900">{inline(line.slice(4))}</h4>);
    else if (line.startsWith("## ")) out.push(<h3 key={i} className="mb-1 mt-6 text-base font-semibold tracking-tight text-zinc-900 first:mt-0">{inline(line.slice(3))}</h3>);
    else if (line.startsWith("# ")) out.push(<h2 key={i} className="mb-1 mt-6 text-lg font-semibold text-zinc-900">{inline(line.slice(2))}</h2>);
    else if (line.trim()) out.push(<p key={i} className="my-2 text-sm leading-relaxed text-zinc-700">{inline(line)}</p>);
  });
  flush();
  return <div>{out}</div>;
}
