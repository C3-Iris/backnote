from aiogram.types import CallbackQuery
from aiogram_dialog import Dialog, DialogManager, Window
from aiogram_dialog.widgets.kbd import Button, Column, Row, ScrollingGroup, Select, Start, SwitchTo
from aiogram_dialog.widgets.text import Const, Format

from backnote.bot.dialogs.common import BACK, PRIMARY, settings, svc, uid
from backnote.bot.dialogs.states import (
    AdminSG,
    AssignmentsSG,
    LessonsSG,
    MainSG,
    SearchSG,
    SubjectsSG,
)
from backnote.db.models import SubjectKind
from backnote.formatting import (
    deadline_badge,
    fmt_datetime,
    h,
    lesson_code,
    percent,
    progress_bar,
    relative,
)


async def menu_getter(dialog_manager: DialogManager, **_):
    s, user_id, tz = svc(dialog_manager), uid(dialog_manager), settings(dialog_manager).tz
    subjects = await s.subjects.count(SubjectKind.SUBJECT)
    courses = await s.subjects.count(SubjectKind.COURSE)
    lessons = await s.lessons.count()
    done = await s.progress.completed_count(user_id)
    upcoming = await s.assignments.upcoming(user_id, limit=3, overdue_days=3)
    cont = await s.progress.continue_lesson(user_id)

    lines = [
        "📚 <b>Backnote</b> — your shared study base",
        f"<blockquote>📘 {subjects} subjects · 🎯 {courses} courses · 🎓 {lessons} lessons\n"
        f"✅ You completed {done} {'lesson' if done == 1 else 'lessons'}</blockquote>",
    ]
    if upcoming:
        lines.append("\n⏰ <b>Coming up</b>")
        for row in upcoming:
            due = row.assignment.due_at
            lines.append(
                f"{deadline_badge(due)} {h(row.assignment.title)} — <i>{h(row.subject.title)}</i>"
                f"\n      {fmt_datetime(due, tz)} · {relative(due)}"
            )
    if cont:
        lesson, subject = cont
        lines.append(f"\n▶️ <b>Up next:</b> {h(subject.title)} · {h(lesson.title)}")

    return {
        "text": "\n".join(lines),
        "is_admin": user_id == settings(dialog_manager).admin_id,
        "has_continue": cont is not None,
        "continue_label": f"▶️ Continue: {lesson_code(cont[0])}" if cont else "",
        "continue_ids": (cont[1].id, cont[0].id) if cont else None,
    }


async def on_continue(_c: CallbackQuery, _b, manager: DialogManager) -> None:
    cont = await svc(manager).progress.continue_lesson(uid(manager))
    if cont:
        lesson, subject = cont
        await manager.start(LessonsSG.view, data={"subject_id": subject.id, "lesson_id": lesson.id})


async def deadlines_getter(dialog_manager: DialogManager, **_):
    tz = settings(dialog_manager).tz
    rows = await svc(dialog_manager).assignments.upcoming(uid(dialog_manager), limit=40)
    items = [
        {
            "id": f"{r.subject.id}:{r.assignment.id}",
            "label": f"{deadline_badge(r.assignment.due_at)} {r.assignment.title} · "
            f"{r.assignment.due_at.astimezone(tz):%d %b}",
        }
        for r in rows
    ]
    if rows:
        body = "\n".join(
            f"{deadline_badge(r.assignment.due_at)} <b>{h(r.assignment.title)}</b>\n"
            f"      <i>{h(r.subject.title)}</i> · {fmt_datetime(r.assignment.due_at, tz)} · "
            f"{relative(r.assignment.due_at)}"
            for r in rows[:15]
        )
        legend = "<i>🔴 overdue · 🟠 &lt;24h · 🟡 &lt;3 days · 🟢 later</i>"
        text = f"⏰ <b>Your open deadlines</b>\n\n{body}\n\n{legend}"
    else:
        text = (
            "⏰ <b>Your open deadlines</b>\n\n"
            "<blockquote>Nothing due. Enjoy the calm 🌿</blockquote>"
        )
    return {"text": text, "items": items}


async def on_deadline(_c: CallbackQuery, _w, manager: DialogManager, item_id: str) -> None:
    subject_id, assignment_id = map(int, item_id.split(":"))
    await manager.start(
        AssignmentsSG.view, data={"subject_id": subject_id, "assignment_id": assignment_id}
    )


async def progress_getter(dialog_manager: DialogManager, **_):
    rows = await svc(dialog_manager).progress.overview(uid(dialog_manager))
    if not rows:
        return {"text": "📊 <b>Your progress</b>\n\n<blockquote>No lessons yet.</blockquote>"}
    total = sum(r.total for r in rows)
    done = sum(r.done for r in rows)
    blocks = []
    for r in rows:
        emoji = "🎯" if r.subject.kind == SubjectKind.COURSE else "📘"
        finished = " 🏁" if r.done == r.total else ""
        blocks.append(
            f"{emoji} <b>{h(r.subject.title)}</b>{finished}\n"
            f"<code>{progress_bar(r.done, r.total)}</code> {r.done}/{r.total} · "
            f"{percent(r.done, r.total)}%"
        )
    text = (
        "📊 <b>Your progress</b>\n"
        f"<blockquote>Overall: <b>{done}/{total}</b> lessons · {percent(done, total)}%\n"
        f"<code>{progress_bar(done, total, 16)}</code></blockquote>\n\n" + "\n\n".join(blocks)
    )
    return {"text": text}


async def settings_getter(dialog_manager: DialogManager, **_):
    user = await svc(dialog_manager).users.get(uid(dialog_manager))

    def state(flag: bool) -> str:
        return "🔔 On" if flag else "🔕 Off"

    return {
        "new_label": f"New lessons & assignments: {state(user.notify_new_content)}",
        "due_label": f"Deadline reminders: {state(user.notify_deadlines)}",
        "hours": settings(dialog_manager).reminder_hours,
    }


async def toggle_setting(_c: CallbackQuery, button: Button, manager: DialogManager) -> None:
    field = {"t_new": "notify_new_content", "t_due": "notify_deadlines"}[button.widget_id]
    user = await svc(manager).users.get(uid(manager))
    await svc(manager).users.update_settings(uid(manager), **{field: not getattr(user, field)})


HELP = """❔ <b>How Backnote works</b>

<b>📘 Subjects</b> — university courses of your programme. KSE runs 5 mini-terms a year with
about 3 subjects at a time, so every subject can be tagged with its <i>year</i> and <i>term</i>.
<b>🎯 Courses</b> — online courses and extra tracks (Coursera, edX, bootcamps…).

Inside each one you will find:
• <b>🎓 Lessons</b> — lectures, seminars, practice sessions, labs. Each has a number, a
recording link (YouTube previews right in the chat), materials, a summary and your private note.
• <b>📝 Assignments</b> — homework with deadlines and reminders.
• <b>📎 Materials</b> — syllabus, slides, books: files or links.

<b>Personal, not shared:</b> ✅ completion marks, assignment status and 🗒 notes.
<b>Shared with everyone:</b> subjects, lessons, materials, assignments and summaries.

<b>🧠 Summaries</b> are shown as Telegram rich messages, so Markdown works:
<blockquote expandable>## Heading
**bold**, *italic*, ==highlight==, ||spoiler||
- bullet lists and 1. numbered lists
| tables | too |
$E = mc^2$ inline and $$\\int_0^1 x\\,dx$$ block formulas
&lt;details&gt;&lt;summary&gt;Answer&lt;/summary&gt;hidden text&lt;/details&gt;</blockquote>

Commands: /start — main menu · /id — your Telegram id"""


def main_dialog() -> Dialog:
    return Dialog(
        Window(
            Format("{text}"),
            Button(
                Format("{continue_label}"),
                id="continue",
                on_click=on_continue,
                when="has_continue",
                style=PRIMARY,
            ),
            Row(
                Start(
                    Const("📘 Subjects"),
                    id="subjects",
                    state=SubjectsSG.list,
                    data={"kind": SubjectKind.SUBJECT.value},
                ),
                Start(
                    Const("🎯 Courses"),
                    id="courses",
                    state=SubjectsSG.list,
                    data={"kind": SubjectKind.COURSE.value},
                ),
            ),
            Row(
                SwitchTo(Const("⏰ Deadlines"), id="deadlines", state=MainSG.deadlines),
                Start(Const("🔎 Search"), id="search", state=SearchSG.query),
            ),
            Row(
                SwitchTo(Const("📊 Progress"), id="progress", state=MainSG.progress),
                SwitchTo(Const("⚙️ Settings"), id="settings", state=MainSG.settings),
            ),
            Row(
                Start(Const("🛡 Admin"), id="admin", state=AdminSG.menu, when="is_admin"),
                SwitchTo(Const("❔ Help"), id="help", state=MainSG.help),
            ),
            state=MainSG.menu,
            getter=menu_getter,
        ),
        Window(
            Format("{text}"),
            ScrollingGroup(
                Select(
                    Format("{item[label]}"),
                    id="deadline",
                    item_id_getter=lambda x: x["id"],
                    items="items",
                    on_click=on_deadline,
                ),
                id="deadlines_scroll",
                width=1,
                height=8,
                hide_on_single_page=True,
            ),
            SwitchTo(BACK, id="back", state=MainSG.menu),
            state=MainSG.deadlines,
            getter=deadlines_getter,
        ),
        Window(
            Format("{text}"),
            SwitchTo(BACK, id="back", state=MainSG.menu),
            state=MainSG.progress,
            getter=progress_getter,
        ),
        Window(
            Format(
                "⚙️ <b>Settings</b>\n\n<blockquote>🆕 Get a message when someone adds a lesson "
                "or an assignment.\n⏰ Get reminded {hours} h before a deadline you haven't "
                "marked as done.</blockquote>"
            ),
            Column(
                Button(Format("{new_label}"), id="t_new", on_click=toggle_setting),
                Button(Format("{due_label}"), id="t_due", on_click=toggle_setting),
            ),
            SwitchTo(BACK, id="back", state=MainSG.menu),
            state=MainSG.settings,
            getter=settings_getter,
        ),
        Window(
            Const(HELP),
            SwitchTo(BACK, id="back", state=MainSG.menu),
            state=MainSG.help,
        ),
    )
