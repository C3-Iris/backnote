import { AnimatePresence, motion } from "motion/react";
import { BookOpen, GraduationCap, Home as HomeIcon, LogOut, Shield, Target } from "lucide-react";
import { Avatar } from "./components/ui";
import { useRoute } from "./lib/router";
import { StoreProvider, useStore } from "./lib/store";
import Admin from "./pages/Admin";
import Catalog from "./pages/Catalog";
import Home from "./pages/Home";
import LessonPage from "./pages/Lesson";
import Login from "./pages/Login";
import SubjectPage from "./pages/Subject";

function Shell() {
  const { me, logout } = useStore();
  const route = useRoute();

  if (!me) return <Login />;

  const nav = [
    { href: "/", label: "Огляд", icon: HomeIcon },
    { href: "/subjects", label: "Предмети", icon: GraduationCap },
    { href: "/courses", label: "Курси", icon: Target },
    ...(me.isAdmin ? [{ href: "/admin", label: "Учасники", icon: Shield }] : []),
  ];

  const isActive = (href: string) => (href === "/" ? route === "/" : route.startsWith(href));
  // Предмет/урок підсвічує розділ, з якого прийшли — спрощено: розділ "Предмети"
  const activeHref = nav.find((n) => isActive(n.href))?.href ?? (route.startsWith("/s/") ? "/subjects" : "/");

  let page;
  const lesson = route.match(/^\/s\/(\d+)\/l\/(\d+)$/);
  const subject = route.match(/^\/s\/(\d+)$/);
  if (lesson) page = <LessonPage subjectId={+lesson[1]} lessonId={+lesson[2]} />;
  else if (subject) page = <SubjectPage id={+subject[1]} />;
  else if (route === "/subjects") page = <Catalog kind="subject" />;
  else if (route === "/courses") page = <Catalog kind="course" />;
  else if (route === "/admin" && me.isAdmin) page = <Admin />;
  else page = <Home />;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white/60 p-3 md:sticky md:top-0 md:flex md:h-screen">
        <a href="#/" className="mb-4 flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white"><BookOpen size={14} /></div>
          <span className="text-sm font-semibold tracking-tight">Backnote</span>
        </a>
        <nav className="space-y-0.5">
          {nav.map((n) => (
            <a key={n.href} href={`#${n.href}`} className="relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-zinc-600 transition hover:text-zinc-900">
              {activeHref === n.href && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-md bg-zinc-100" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
              <n.icon size={15} className="relative" />
              <span className={`relative ${activeHref === n.href ? "font-medium text-zinc-900" : ""}`}>{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 rounded-lg p-2">
          <Avatar name={me.fullName} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{me.fullName}</div>
            <div className="truncate text-xs text-zinc-400">{me.username ? `@${me.username}` : me.id}</div>
          </div>
          <button onClick={logout} aria-label="Вийти" className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"><LogOut size={15} /></button>
        </div>
      </aside>

      {/* мобільна навігація */}
      <header className="sticky top-0 z-30 flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white/80 px-3 py-2 backdrop-blur md:hidden">
        {nav.map((n) => (
          <a key={n.href} href={`#${n.href}`} className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${activeHref === n.href ? "bg-zinc-100 font-medium" : "text-zinc-500"}`}>
            <n.icon size={14} /> {n.label}
          </a>
        ))}
        <button onClick={logout} aria-label="Вийти" className="ml-auto shrink-0 p-1.5 text-zinc-400"><LogOut size={15} /></button>
      </header>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12">
          <AnimatePresence mode="wait">
            <motion.div key={route} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {page}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
