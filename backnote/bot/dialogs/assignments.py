from datetime import datetime
from typing import Any

from aiogram.types import CallbackQuery, Message
from aiogram_dialog import Dialog, DialogManager, Window
from aiogram_dialog.widgets.input import MessageInput
from aiogram_dialog.widgets.kbd import (
    Button,
    Cancel,
    Group,
    Row,
    ScrollingGroup,
    Select,
    SwitchTo,
    Url,
)
from aiogram_dialog.widgets.text import Const, Format

from backnote.bot.dialogs.common import (
    BACK,
    CANCEL,
    DANGER,
    PRIMARY,
    SUCCESS,
    Field,
    can_delete,
    copy_start_data,
    data_id,
    deadline_windows,
    field_buttons,
    field_editor_window,
    notifier,
    settings,
    svc,
    uid,
)
from backnote.bot.dialogs.states import AssignmentCreateSG, AssignmentsSG, MaterialsSG
from backnote.formatting import deadline_badge, fmt_datetime, h, quote, relative

ASSIGNMENT_FIELDS = {
    f.key: f
    for f in [
        Field("title", "📝 Title", "Send the new title.", optional=False),
        Field("description", "📄 Description", "Task text, requirements, format…", "longtext"),
        Field("url", "🔗 Link", "Link to the task (LMS, Google Doc…).", "url"),
    ]
}


# ------------------------------------------------------------------ list


async def list_getter(dialog_manager: DialogManager, **_):
    s = svc(dialog_manager)
    tz = settings(dialog_manager).tz
    subject = await s.subjects.get(data_id(dialog_manager, "subject_id"))
    rows = await s.assignments.list_for_subject(subject.id, uid(dialog_manager))
    items = []
    for r in rows:
        a = r.assignment
        mark = "✅" if r.done else (deadline_badge(a.due_at) if a.due_at else "⬜")
        due = f" · {a.due_at.astimezone(tz):%d %b}" if a.due_at else ""
        items.append({"id": a.id, "label": f"{mark} {a.title}{due}"})
    open_count = sum(not r.done for r in rows)
    text = f"📝 <b>Assignments</b> · {h(subject.title)}\n"
    if rows:
        text += f"<blockquote>{open_count} open · {len(rows) - open_count} done by you</blockquote>"
    else:
        text += "\n<blockquote>No assignments yet.</blockquote>"
    return {"text": text, "items": items}


async def on_assignment(_c: CallbackQuery, _w, manager: DialogManager, item: int) -> None:
    manager.dialog_data["assignment_id"] = item
    await manager.switch_to(AssignmentsSG.view)


async def on_add(_c: CallbackQuery, _b, manager: DialogManager) -> None:
    await manager.start(
        AssignmentCreateSG.title, data={"subject_id": data_id(manager, "subject_id")}
    )


async def on_result(_start_data: Any, result: Any, manager: DialogManager) -> None:
    if isinstance(result, dict) and result.get("assignment_id"):
        manager.dialog_data["assignment_id"] = result["assignment_id"]
        await manager.switch_to(AssignmentsSG.view)


# ------------------------------------------------------------------ view


async def view_getter(dialog_manager: DialogManager, **_):
    s, user_id = svc(dialog_manager), uid(dialog_manager)
    tz = settings(dialog_manager).tz
    a = await s.assignments.get(data_id(dialog_manager, "assignment_id"))
    if a is None:
        return {"text": "This assignment was deleted.", "missing": True}
    subject = await s.subjects.get(a.subject_id)
    done = await s.assignments.is_done(a.id, user_id)
    files = len(await s.materials.list_for(subject_id=a.subject_id, assignment_id=a.id))
    lines = [f"📝 <b>{h(a.title)}</b>", f"📘 {h(subject.title)}"]
    if a.due_at:
        lines.append(
            f"{deadline_badge(a.due_at)} Due <b>{fmt_datetime(a.due_at, tz)}</b> "
            f"({relative(a.due_at)})"
        )
    else:
        lines.append("⏰ <i>No deadline</i>")
    if a.description:
        lines.append(quote(a.description))
    lines.append("\n✅ <b>Done</b>" if done else "\n⬜ <i>Not done yet</i>")
    return {
        "text": "\n".join(lines),
        "missing": False,
        "url": a.url,
        "not_done": not done,
        "toggle_label": "↩️ Mark as not done" if done else "✅ Mark as done",
        "files_label": f"📎 Files ({files})",
    }


async def toggle_done(callback: CallbackQuery, _b, manager: DialogManager) -> None:
    done = await svc(manager).assignments.toggle_done(
        data_id(manager, "assignment_id"), uid(manager)
    )
    await callback.answer("Nice work! ✅" if done else "Marked as not done")


async def open_files(_c: CallbackQuery, _b, manager: DialogManager) -> None:
    await manager.start(
        MaterialsSG.list,
        data={
            "subject_id": data_id(manager, "subject_id"),
            "assignment_id": data_id(manager, "assignment_id"),
        },
    )


# ------------------------------------------------------------------ edit


async def edit_getter(dialog_manager: DialogManager, **_):
    a = await svc(dialog_manager).assignments.get(data_id(dialog_manager, "assignment_id"))
    return {
        "text": f"✏️ <b>Edit</b> · {h(a.title)}",
        "can_delete": can_delete(dialog_manager, a.created_by),
    }


async def load_field(manager: DialogManager, key: str):
    return getattr(await svc(manager).assignments.get(data_id(manager, "assignment_id")), key)


async def save_field(manager: DialogManager, key: str, value) -> None:
    await svc(manager).assignments.update(data_id(manager, "assignment_id"), **{key: value})


async def save_deadline(manager: DialogManager, due: datetime | None) -> None:
    await svc(manager).assignments.update(data_id(manager, "assignment_id"), due_at=due)
    await manager.switch_to(AssignmentsSG.view)


async def on_delete(_c: CallbackQuery, _b, manager: DialogManager) -> None:
    a = await svc(manager).assignments.get(data_id(manager, "assignment_id"))
    if a and can_delete(manager, a.created_by):
        await svc(manager).assignments.delete(a.id)
    manager.dialog_data.pop("assignment_id", None)
    await manager.switch_to(AssignmentsSG.list)


def assignments_dialog() -> Dialog:
    return Dialog(
        Window(
            Format("{text}"),
            ScrollingGroup(
                Select(
                    Format("{item[label]}"),
                    id="assignment",
                    item_id_getter=lambda x: x["id"],
                    items="items",
                    type_factory=int,
                    on_click=on_assignment,
                ),
                id="assignments_scroll",
                width=1,
                height=8,
                hide_on_single_page=True,
            ),
            Button(Const("➕ Add assignment"), id="add", on_click=on_add, style=PRIMARY),
            Cancel(BACK),
            state=AssignmentsSG.list,
            getter=list_getter,
        ),
        Window(
            Format("{text}"),
            Group(
                Button(
                    Format("{toggle_label}"),
                    id="toggle",
                    on_click=toggle_done,
                    style=SUCCESS,
                    when="not_done",
                ),
                Button(
                    Format("{toggle_label}"),
                    id="untoggle",
                    on_click=toggle_done,
                    when=lambda d, *_: not d["not_done"],
                ),
                Row(
                    Url(Const("🔗 Open task"), Format("{url}"), when="url"),
                    Button(Format("{files_label}"), id="files", on_click=open_files),
                ),
                SwitchTo(Const("✏️ Edit"), id="edit", state=AssignmentsSG.edit),
                when=lambda d, *_: not d["missing"],
            ),
            SwitchTo(Const("📋 All assignments"), id="back", state=AssignmentsSG.list),
            state=AssignmentsSG.view,
            getter=view_getter,
        ),
        Window(
            Format("{text}"),
            field_buttons(ASSIGNMENT_FIELDS, AssignmentsSG.edit_field),
            SwitchTo(Const("⏰ Deadline"), id="due", state=AssignmentsSG.due_date),
            SwitchTo(
                Const("🗑 Delete"),
                id="delete",
                state=AssignmentsSG.delete,
                when="can_delete",
                style=DANGER,
            ),
            SwitchTo(BACK, id="back", state=AssignmentsSG.view),
            state=AssignmentsSG.edit,
            getter=edit_getter,
        ),
        field_editor_window(
            AssignmentsSG.edit_field, AssignmentsSG.edit, ASSIGNMENT_FIELDS, load_field, save_field
        ),
        *deadline_windows(
            AssignmentsSG.due_date,
            AssignmentsSG.due_time,
            AssignmentsSG.edit,
            save_deadline,
            "Change deadline",
        ),
        Window(
            Const("🗑 Delete this assignment for everyone?"),
            Row(
                Button(Const("🗑 Yes, delete"), id="confirm", on_click=on_delete, style=DANGER),
                SwitchTo(CANCEL, id="cancel", state=AssignmentsSG.edit),
            ),
            state=AssignmentsSG.delete,
        ),
        on_start=copy_start_data,
        on_process_result=on_result,
    )


# ------------------------------------------------------------------ create wizard


async def create_title(message: Message, _w, manager: DialogManager) -> None:
    title = (message.text or "").strip()
    if not title or len(title) > 256:
        await message.answer("⚠️ Send a title up to 256 characters.")
        return
    manager.dialog_data["title"] = title
    await manager.switch_to(AssignmentCreateSG.due_date)


async def create_deadline(manager: DialogManager, due: datetime | None) -> None:
    manager.dialog_data["due_at"] = due.isoformat() if due else None
    await manager.switch_to(AssignmentCreateSG.description)


async def _create(manager: DialogManager, description: str | None) -> None:
    s = svc(manager)
    d = manager.dialog_data
    due = datetime.fromisoformat(d["due_at"]) if d.get("due_at") else None
    assignment = await s.assignments.create(
        subject_id=data_id(manager, "subject_id"),
        title=d["title"],
        description=description,
        due_at=due,
        created_by=uid(manager),
    )
    subject = await s.subjects.get(assignment.subject_id)
    notifier(manager).new_assignment(assignment, subject, await s.users.get(uid(manager)))
    await manager.done({"assignment_id": assignment.id})


async def create_description(message: Message, _w, manager: DialogManager) -> None:
    text = (message.text or "").strip()
    if len(text) > 4000:
        await message.answer("⚠️ Keep it under 4000 characters.")
        return
    await _create(manager, text or None)


async def skip_description(_c: CallbackQuery, _b, manager: DialogManager) -> None:
    await _create(manager, None)


def assignment_create_dialog() -> Dialog:
    return Dialog(
        Window(
            Const("➕ <b>New assignment</b>\n\nSend the title.\n<i>Example: Problem set 2</i>"),
            MessageInput(create_title, content_types=["text"]),
            Cancel(CANCEL),
            state=AssignmentCreateSG.title,
        ),
        *deadline_windows(
            AssignmentCreateSG.due_date,
            AssignmentCreateSG.due_time,
            AssignmentCreateSG.title,
            create_deadline,
            "New assignment",
        ),
        Window(
            Const(
                "📄 Send the task description (requirements, format, links) or skip.\n"
                "<i>Files can be attached right after creation.</i>"
            ),
            MessageInput(create_description, content_types=["text"]),
            Button(Const("⏭ Skip & create"), id="skip", on_click=skip_description, style=PRIMARY),
            Cancel(CANCEL),
            state=AssignmentCreateSG.description,
        ),
        on_start=copy_start_data,
    )
