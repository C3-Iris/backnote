"""Shared helpers and widgets for dialogs."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any

from aiogram.enums import ButtonStyle
from aiogram.types import CallbackQuery, LinkPreviewOptions, Message
from aiogram_dialog import DialogManager, ShowMode, Window
from aiogram_dialog.widgets.input import MessageInput
from aiogram_dialog.widgets.kbd import Button, Calendar, Group, Row, Select, SwitchTo
from aiogram_dialog.widgets.link_preview import LinkPreviewBase
from aiogram_dialog.widgets.style import Style
from aiogram_dialog.widgets.text import Const, Format

from backnote.ai import GeminiSummarizer
from backnote.bot.notifier import Notifier
from backnote.config import Settings
from backnote.formatting import h, normalize_url
from backnote.services import Services

PRIMARY = Style(ButtonStyle.PRIMARY)
SUCCESS = Style(ButtonStyle.SUCCESS)
DANGER = Style(ButtonStyle.DANGER)

BACK = Const("⬅️ Back")
CANCEL = Const("✖️ Cancel")


def svc(m: DialogManager) -> Services:
    return m.middleware_data["svc"]


def settings(m: DialogManager) -> Settings:
    return m.middleware_data["settings"]


def notifier(m: DialogManager) -> Notifier:
    return m.middleware_data["notifier"]


def summarizer(m: DialogManager) -> GeminiSummarizer | None:
    return m.middleware_data.get("summarizer")


def uid(m: DialogManager) -> int:
    return m.event.from_user.id


def is_admin(m: DialogManager) -> bool:
    return uid(m) == settings(m).admin_id


def can_delete(m: DialogManager, created_by: int | None) -> bool:
    return is_admin(m) or created_by == uid(m)


def deep_link(m: DialogManager, payload: str) -> str:
    return f"https://t.me/{m.middleware_data.get('bot_username', 'bot')}?start={payload}"


def data_id(m: DialogManager, key: str) -> int | None:
    value = m.dialog_data.get(key)
    return int(value) if value is not None else None


async def copy_start_data(start_data: Any, manager: DialogManager) -> None:
    if isinstance(start_data, dict):
        manager.dialog_data.update(start_data)


class DynamicPreview(LinkPreviewBase):
    """Shows a large preview for `preview_url` (e.g. a YouTube lecture) or disables previews."""

    async def _render_link_preview(self, data: dict, manager: DialogManager):
        url = data.get("preview_url")
        if not url:
            return LinkPreviewOptions(is_disabled=True)
        return LinkPreviewOptions(url=url, prefer_large_media=True, show_above_text=True)


# ---------------------------------------------------------------------------
# Generic single-field editor: a window asks for one value and stores it.


@dataclass(frozen=True)
class Field:
    key: str
    label: str
    prompt: str
    kind: str = "text"  # text | longtext | int | url
    optional: bool = True
    max_len: int = 256
    min_value: int | None = None
    max_value: int | None = None

    def parse(self, raw: str) -> Any:
        raw = raw.strip()
        if not raw:
            raise ValueError("The value cannot be empty.")
        if self.kind == "int":
            if not raw.lstrip("-").isdigit():
                raise ValueError("Please send a whole number.")
            value = int(raw)
            if self.min_value is not None and value < self.min_value:
                raise ValueError(f"The number must be at least {self.min_value}.")
            if self.max_value is not None and value > self.max_value:
                raise ValueError(f"The number must be at most {self.max_value}.")
            return value
        if self.kind == "url":
            url = normalize_url(raw)
            if not url:
                raise ValueError("That doesn't look like a link. Example: https://example.com")
            return url
        limit = 4000 if self.kind == "longtext" else self.max_len
        if len(raw) > limit:
            raise ValueError(f"Too long: {len(raw)} characters, the limit is {limit}.")
        return raw

    def show(self, value: Any) -> str:
        if value is None or value == "":
            return "<i>not set</i>"
        if self.kind == "longtext":
            return f"<blockquote expandable>{h(value)}</blockquote>"
        return f"<code>{h(value)}</code>" if self.kind == "url" else f"<b>{h(value)}</b>"


SaveField = Callable[[DialogManager, str, Any], Awaitable[None]]
LoadField = Callable[[DialogManager, str], Awaitable[Any]]


def field_editor_window(
    state,
    back_state,
    fields: dict[str, Field],
    load: LoadField,
    save: SaveField,
) -> Window:
    """Window that edits `dialog_data["field"]` from `fields` and returns to `back_state`."""

    async def getter(dialog_manager: DialogManager, **_):
        field = fields[dialog_manager.dialog_data["field"]]
        current = await load(dialog_manager, field.key)
        return {
            "text": (
                f"✏️ <b>{h(field.label)}</b>\n\nCurrent: {field.show(current)}\n\n"
                f"<i>{h(field.prompt)}</i>"
            ),
            "optional": field.optional and current not in (None, ""),
        }

    async def on_input(message: Message, _w, manager: DialogManager) -> None:
        field = fields[manager.dialog_data["field"]]
        try:
            value = field.parse(message.text or "")
        except ValueError as exc:
            await message.answer(f"⚠️ {h(exc)}")
            return
        await save(manager, field.key, value)
        await manager.switch_to(back_state)

    async def on_clear(_c: CallbackQuery, _b, manager: DialogManager) -> None:
        await save(manager, manager.dialog_data["field"], None)
        await manager.switch_to(back_state)

    return Window(
        Format("{text}"),
        MessageInput(on_input, content_types=["text"]),
        Button(Const("🧹 Clear"), id="clear", on_click=on_clear, when="optional"),
        SwitchTo(BACK, id="back", state=back_state),
        state=state,
        getter=getter,
    )


def field_buttons(fields: dict[str, Field], edit_state, *, when=None) -> Group:
    async def pick(_c: CallbackQuery, button: Button, manager: DialogManager) -> None:
        manager.dialog_data["field"] = button.widget_id.removeprefix("f_")
        await manager.switch_to(edit_state)

    return Group(
        *[Button(Const(f.label), id=f"f_{f.key}", on_click=pick) for f in fields.values()],
        width=2,
        when=when,
    )


# ---------------------------------------------------------------------------
# Deadline picker: calendar -> time.

TIME_PRESETS = ["09:00", "12:00", "15:00", "18:00", "21:00", "23:59"]


def parse_time(raw: str) -> time:
    raw = raw.strip().replace(".", ":")
    try:
        hours, minutes = raw.split(":") if ":" in raw else (raw, "0")
        return time(int(hours), int(minutes))
    except ValueError as exc:
        raise ValueError("Send the time as HH:MM, for example 23:59.") from exc


def combine_local(d: date, t: time, tz) -> datetime:
    return datetime.combine(d, t, tzinfo=tz)


OnDeadline = Callable[[DialogManager, datetime | None], Awaitable[None]]


def deadline_windows(date_state, time_state, back_state, on_done: OnDeadline, title: str):
    async def on_date(_c: CallbackQuery, _w, manager: DialogManager, selected: date) -> None:
        manager.dialog_data["due_date"] = selected.isoformat()
        await manager.switch_to(time_state)

    async def on_no_deadline(_c: CallbackQuery, _b, manager: DialogManager) -> None:
        await on_done(manager, None)

    async def finish(manager: DialogManager, t: time) -> None:
        d = date.fromisoformat(manager.dialog_data["due_date"])
        await on_done(manager, combine_local(d, t, settings(manager).tz))

    async def on_preset(_c: CallbackQuery, _w, manager: DialogManager, item: str) -> None:
        await finish(manager, parse_time(item))

    async def on_time_text(message: Message, _w, manager: DialogManager) -> None:
        try:
            t = parse_time(message.text or "")
        except ValueError as exc:
            await message.answer(f"⚠️ {h(exc)}")
            return
        await finish(manager, t)

    async def time_getter(dialog_manager: DialogManager, **_):
        d = date.fromisoformat(dialog_manager.dialog_data["due_date"])
        return {"day": d.strftime("%a, %d %b %Y"), "presets": TIME_PRESETS}

    return [
        Window(
            Const(f"⏰ <b>{title}</b>\n\nPick the deadline date:"),
            Calendar(id="due_cal", on_click=on_date),
            Button(Const("🚫 No deadline"), id="no_due", on_click=on_no_deadline),
            SwitchTo(BACK, id="back", state=back_state),
            state=date_state,
        ),
        Window(
            Format("⏰ <b>Deadline time</b> for {day}\n\n<i>Pick a time or send it as HH:MM.</i>"),
            Group(
                Select(
                    Format("{item}"),
                    id="time",
                    item_id_getter=lambda x: x,
                    items="presets",
                    on_click=on_preset,
                ),
                width=3,
            ),
            MessageInput(on_time_text, content_types=["text"]),
            Row(SwitchTo(BACK, id="back", state=date_state)),
            state=time_state,
            getter=time_getter,
        ),
    ]


def resend(manager: DialogManager) -> None:
    """Re-render the dialog as a new message below something we just sent."""
    manager.show_mode = ShowMode.SEND
