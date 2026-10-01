import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_LESSONS, DEMO_SUBJECTS, DEMO_USERS } from "./data";
import type { Lesson, Subject, User, UserStatus } from "./types";

/**
 * Демо-сховище на localStorage.
 * У реальному проєкті кожна дія нижче — це один виклик REST API (FastAPI),
 * який працює з тією самою SQLite-базою, що й бот.
 */

const STATE_KEY = "backnote:state:v1";
const SESSION_KEY = "backnote:session:v1";
const SESSION_DAYS = 30;

interface Persisted {
  users: User[];
  done: Record<string, number[]>; // userId -> lessonIds
  notes: Record<string, string>; // `${userId}:${lessonId}` -> text
}

const initial = (): Persisted => ({ users: DEMO_USERS, done: { "100000002": [1, 3] }, notes: {} });

function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* ignore */
  }
  return initial();
}

function loadSession(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { userId: number; expires: number };
    return s.expires > Date.now() ? s.userId : null;
  } catch {
    return null;
  }
}

export type LoginResult = "ok" | "requested" | "pending" | "blocked";

interface Store {
  me: User | null;
  users: User[];
  subjects: Subject[];
  lessons: Lesson[];
  login: (id: number, name?: string) => LoginResult;
  logout: () => void;
  isDone: (lessonId: number) => boolean;
  toggleDone: (lessonId: number) => void;
  progress: (subjectId: number) => { done: number; total: number };
  getNote: (lessonId: number) => string;
  setNote: (lessonId: number, text: string) => void;
  setStatus: (userId: number, status: UserStatus) => void;
  addUser: (id: number, name: string) => void;
  removeUser: (userId: number) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(loadState);
  const [sessionId, setSessionId] = useState<number | null>(loadSession);

  useEffect(() => {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [state]);

  const me = useMemo(() => {
    const u = state.users.find((x) => x.id === sessionId);
    return u && u.status === "active" ? u : null;
  }, [state.users, sessionId]);

  const login = useCallback(
    (id: number, name?: string): LoginResult => {
      const user = state.users.find((u) => u.id === id);
      if (!user) {
        // Так само, як у боті: незнайомець надсилає запит на доступ.
        setState((s) => ({
          ...s,
          users: [...s.users, { id, fullName: name || `ID ${id}`, status: "pending", createdAt: new Date().toISOString().slice(0, 10) }],
        }));
        return "requested";
      }
      if (user.status === "blocked") return "blocked";
      if (user.status === "pending") return "pending";
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: id, expires: Date.now() + SESSION_DAYS * 86400000 }));
      setSessionId(id);
      return "ok";
    },
    [state.users],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    window.location.hash = "/";
  }, []);

  const doneSet = useMemo(() => new Set(me ? state.done[String(me.id)] ?? [] : []), [state.done, me]);

  const isDone = useCallback((id: number) => doneSet.has(id), [doneSet]);

  const toggleDone = useCallback(
    (lessonId: number) => {
      if (!me) return;
      setState((s) => {
        const key = String(me.id);
        const cur = s.done[key] ?? [];
        const next = cur.includes(lessonId) ? cur.filter((x) => x !== lessonId) : [...cur, lessonId];
        return { ...s, done: { ...s.done, [key]: next } };
      });
    },
    [me],
  );

  const progress = useCallback(
    (subjectId: number) => {
      const ls = DEMO_LESSONS.filter((l) => l.subjectId === subjectId);
      return { done: ls.filter((l) => doneSet.has(l.id)).length, total: ls.length };
    },
    [doneSet],
  );

  const getNote = useCallback((lessonId: number) => (me ? state.notes[`${me.id}:${lessonId}`] ?? "" : ""), [state.notes, me]);

  const setNote = useCallback(
    (lessonId: number, text: string) => {
      if (!me) return;
      setState((s) => ({ ...s, notes: { ...s.notes, [`${me.id}:${lessonId}`]: text } }));
    },
    [me],
  );

  const setStatus = useCallback((userId: number, status: UserStatus) => {
    setState((s) => ({ ...s, users: s.users.map((u) => (u.id === userId ? { ...u, status } : u)) }));
  }, []);

  const addUser = useCallback((id: number, name: string) => {
    setState((s) =>
      s.users.some((u) => u.id === id)
        ? { ...s, users: s.users.map((u) => (u.id === id ? { ...u, status: "active" } : u)) }
        : { ...s, users: [...s.users, { id, fullName: name || `ID ${id}`, status: "active", createdAt: new Date().toISOString().slice(0, 10) }] },
    );
  }, []);

  const removeUser = useCallback((userId: number) => {
    setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== userId) }));
  }, []);

  const value: Store = {
    me,
    users: state.users,
    subjects: DEMO_SUBJECTS,
    lessons: DEMO_LESSONS,
    login,
    logout,
    isDone,
    toggleDone,
    progress,
    getNote,
    setNote,
    setStatus,
    addUser,
    removeUser,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}
