import type { Lesson, Subject, User } from "./types";

// Демо-дані. У продакшені замінюються відповідями API (див. store.tsx).
export const DEMO_USERS: User[] = [
  { id: 100000001, username: "iris", fullName: "Iris (адмін)", status: "active", isAdmin: true, createdAt: "2025-09-01" },
  { id: 100000002, username: "max_dev", fullName: "Максим Шевченко", status: "active", createdAt: "2025-09-03" },
  { id: 100000003, username: "olya", fullName: "Ольга Бондар", status: "active", createdAt: "2025-09-10" },
  { id: 100000004, username: "danylo", fullName: "Данило Крук", status: "pending", createdAt: "2026-01-12" },
];

export const DEMO_SUBJECTS: Subject[] = [
  {
    id: 1, kind: "subject", title: "Алгоритми та структури даних", code: "ALG201", instructor: "О. Коваленко",
    description: "Складність алгоритмів, масиви, списки, дерева, графи та динамічне програмування.",
    year: 2, term: 1, ects: 5, archived: false,
  },
  {
    id: 2, kind: "subject", title: "Бази даних", code: "DB210", instructor: "І. Мельник",
    description: "Реляційна модель, SQL, нормалізація, індекси та транзакції.",
    year: 2, term: 2, ects: 5, archived: false,
  },
  {
    id: 3, kind: "subject", title: "Архітектура програмного забезпечення", code: "ARC301", instructor: "В. Лисенко",
    description: "Шаблони проєктування, шари, мікросервіси та компроміси в архітектурі.",
    year: 3, term: 1, ects: 4, archived: false,
  },
  {
    id: 4, kind: "subject", title: "Лінійна алгебра", code: "MTH110", instructor: "Т. Гриценко",
    description: "Матриці, вектори, власні значення.", year: 1, term: 3, ects: 4, archived: true,
  },
  {
    id: 5, kind: "course", title: "AI Agents", provider: "Hugging Face", url: "https://huggingface.co/learn",
    description: "Практичний курс про побудову агентів на основі LLM.", archived: false,
  },
  {
    id: 6, kind: "course", title: "CS50: Introduction to Computer Science", provider: "edX", url: "https://cs50.harvard.edu",
    description: "Класичний вступ до інформатики від Гарварду.", archived: false,
  },
];

const bigO = `## Головне

- **O(1)** — константний час
- **O(log n)** — бінарний пошук
- **O(n log n)** — ефективні сортування

### Порівняння

- [x] Лінійний пошук — O(n)
- [x] Бінарний пошук — O(log n)
- [ ] Хеш-таблиця — O(1) у середньому

## Приклад

Для масиву з \`n = 1 000 000\` елементів бінарний пошук робить приблизно **20** кроків.`;

const trees = `## Бінарні дерева пошуку

Для кожного вузла: **ліве піддерево < вузол < праве піддерево**.

- Пошук, вставка, видалення — O(h), де \`h\` — висота дерева
- У найгіршому випадку (виродження в список) \`h = n\`
- AVL та червоно-чорні дерева тримають висоту біля \`log n\``;

const sql = `## Нормалізація

- **1НФ** — атомарні значення в колонках
- **2НФ** — немає часткових залежностей від ключа
- **3НФ** — немає транзитивних залежностей

### Для перевірки

- [x] Розумію різницю між 2НФ і 3НФ
- [ ] Можу нормалізувати таблицю замовлень`;

export const DEMO_LESSONS: Lesson[] = [
  { id: 1, subjectId: 1, number: 1, kind: "lecture", title: "Складність алгоритмів та O-нотація", heldOn: "2025-09-05", description: "Вступ до асимптотичного аналізу.", videoUrl: "https://www.youtube.com/watch?v=demo1", summary: bigO, summarySource: "ai" },
  { id: 2, subjectId: 1, number: 2, kind: "lecture", title: "Масиви та зв'язні списки", heldOn: "2025-09-12", summary: "## Масив vs список\n\n- Масив: доступ за індексом **O(1)**, вставка **O(n)**\n- Список: вставка **O(1)** за посиланням, доступ **O(n)**", summarySource: "manual" },
  { id: 3, subjectId: 1, number: 1, kind: "practice", title: "Бінарний пошук", heldOn: "2025-09-14", description: "Реалізуємо бінарний пошук та розбираємо крайові випадки." },
  { id: 4, subjectId: 1, number: 3, kind: "lecture", title: "Дерева пошуку", heldOn: "2025-09-19", summary: trees, summarySource: "ai", videoUrl: "https://www.youtube.com/watch?v=demo2" },
  { id: 5, subjectId: 2, number: 1, kind: "lecture", title: "Реляційна модель", heldOn: "2026-02-10", description: "Відношення, ключі, реляційна алгебра." },
  { id: 6, subjectId: 2, number: 2, kind: "lecture", title: "Нормалізація", heldOn: "2026-02-17", summary: sql, summarySource: "manual" },
  { id: 7, subjectId: 2, number: 1, kind: "lab", title: "SQL: JOIN та агрегації", heldOn: "2026-02-20" },
  { id: 8, subjectId: 3, number: 1, kind: "lecture", title: "Шари та залежності", heldOn: "2025-09-06" },
  { id: 9, subjectId: 3, number: 2, kind: "lecture", title: "Шаблони проєктування", heldOn: "2025-09-13", videoUrl: "https://www.youtube.com/watch?v=demo3" },
  { id: 10, subjectId: 5, number: 1, kind: "video", title: "Що таке агент?", description: "Цикл «думка — дія — спостереження».", videoUrl: "https://www.youtube.com/watch?v=demo4" },
  { id: 11, subjectId: 5, number: 2, kind: "reading", title: "Інструменти та виклик функцій" },
  { id: 12, subjectId: 6, number: 1, kind: "lecture", title: "Week 0: Scratch", videoUrl: "https://www.youtube.com/watch?v=demo5" },
  { id: 13, subjectId: 6, number: 2, kind: "lecture", title: "Week 1: C" },
  { id: 14, subjectId: 4, number: 1, kind: "lecture", title: "Матриці та операції" },
];
