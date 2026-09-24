import asyncio
import logging
from datetime import timedelta

from backnote.bot.notifier import Notifier, open_kb
from backnote.formatting import fmt_datetime, h, relative
from backnote.services import Services

log = logging.getLogger(__name__)

CHECK_EVERY = 10 * 60


async def send_due_reminders(svc: Services, notifier: Notifier, hours: int, tz) -> int:
    kind = f"{hours}h"
    sent = 0
    for user_id, assignment, subject in await svc.assignments.due_reminders(
        horizon=timedelta(hours=hours), kind=kind
    ):
        text = (
            f"⏰ <b>Deadline {relative(assignment.due_at)}</b>\n"
            f"<blockquote>📝 {h(assignment.title)}\n📘 {h(subject.title)}\n"
            f"🗓 {fmt_datetime(assignment.due_at, tz)}</blockquote>"
        )
        # Log even on failure so a user who blocked the bot is not retried every cycle.
        if await notifier.send(user_id, text, open_kb("assignment", assignment.id, "📝 Open")):
            sent += 1
        await svc.assignments.log_reminder(user_id, assignment.id, kind)
    return sent


async def reminders_loop(svc: Services, notifier: Notifier, hours: int, tz) -> None:
    while True:
        try:
            sent = await send_due_reminders(svc, notifier, hours, tz)
            if sent:
                log.info("Sent %s deadline reminders", sent)
        except Exception:
            log.exception("Reminder loop failed")
        await asyncio.sleep(CHECK_EVERY)
