from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, delete, exists, func, select

from backnote.db.models import (
    Assignment,
    AssignmentProgress,
    ReminderLog,
    Subject,
    User,
    UserStatus,
    utcnow,
)
from backnote.services.base import BaseService, apply_fields


@dataclass(frozen=True)
class AssignmentRow:
    assignment: Assignment
    done: bool


@dataclass(frozen=True)
class DeadlineRow:
    assignment: Assignment
    subject: Subject


class AssignmentService(BaseService):
    EDITABLE = frozenset({"title", "description", "url", "due_at", "lesson_id"})

    async def create(
        self, *, subject_id: int, title: str, created_by: int, **fields: Any
    ) -> Assignment:
        assignment = Assignment(subject_id=subject_id, title=title, created_by=created_by)
        apply_fields(assignment, fields, set(self.EDITABLE))
        async with self._sm() as s:
            s.add(assignment)
            await s.commit()
            return assignment

    async def get(self, assignment_id: int) -> Assignment | None:
        async with self._sm() as s:
            return await s.get(Assignment, assignment_id)

    async def update(self, assignment_id: int, **fields: Any) -> Assignment:
        async with self._sm() as s:
            assignment = await s.get(Assignment, assignment_id)
            if assignment is None:
                raise LookupError(assignment_id)
            apply_fields(assignment, fields, set(self.EDITABLE))
            if "due_at" in fields:
                # A new deadline deserves a new reminder.
                await s.execute(
                    delete(ReminderLog).where(ReminderLog.assignment_id == assignment_id)
                )
            await s.commit()
            return assignment

    async def delete(self, assignment_id: int) -> None:
        async with self._sm() as s:
            await s.execute(delete(Assignment).where(Assignment.id == assignment_id))
            await s.commit()

    async def list_for_subject(self, subject_id: int, user_id: int) -> list[AssignmentRow]:
        query = (
            select(Assignment, AssignmentProgress.assignment_id.is_not(None))
            .outerjoin(
                AssignmentProgress,
                and_(
                    AssignmentProgress.assignment_id == Assignment.id,
                    AssignmentProgress.user_id == user_id,
                ),
            )
            .where(Assignment.subject_id == subject_id)
            .order_by(Assignment.due_at.is_(None), Assignment.due_at, Assignment.id)
        )
        async with self._sm() as s:
            return [AssignmentRow(a, bool(done)) for a, done in await s.execute(query)]

    def _open_for_user(self, user_id: int):
        return ~exists().where(
            AssignmentProgress.assignment_id == Assignment.id,
            AssignmentProgress.user_id == user_id,
        )

    async def upcoming(
        self,
        user_id: int,
        *,
        overdue_days: int = 14,
        limit: int = 30,
        now: datetime | None = None,
    ) -> list[DeadlineRow]:
        """Open (not done by this user) assignments with a deadline, including recent overdue."""
        now = now or utcnow()
        query = (
            select(Assignment, Subject)
            .join(Subject, Subject.id == Assignment.subject_id)
            .where(
                Subject.is_archived.is_(False),
                Assignment.due_at.is_not(None),
                Assignment.due_at >= now - timedelta(days=overdue_days),
                self._open_for_user(user_id),
            )
            .order_by(Assignment.due_at)
            .limit(limit)
        )
        async with self._sm() as s:
            return [DeadlineRow(a, subj) for a, subj in await s.execute(query)]

    async def open_count(self, subject_id: int, user_id: int) -> int:
        async with self._sm() as s:
            return await s.scalar(
                select(func.count(Assignment.id)).where(
                    Assignment.subject_id == subject_id, self._open_for_user(user_id)
                )
            )

    async def is_done(self, assignment_id: int, user_id: int) -> bool:
        async with self._sm() as s:
            return await s.get(AssignmentProgress, (user_id, assignment_id)) is not None

    async def toggle_done(self, assignment_id: int, user_id: int) -> bool:
        async with self._sm() as s:
            row = await s.get(AssignmentProgress, (user_id, assignment_id))
            if row:
                await s.delete(row)
            else:
                s.add(AssignmentProgress(user_id=user_id, assignment_id=assignment_id))
            await s.commit()
            return row is None

    async def due_reminders(
        self, *, horizon: timedelta, kind: str, now: datetime | None = None
    ) -> list[tuple[int, Assignment, Subject]]:
        """(user_id, assignment, subject) triples that still need a reminder of this kind."""
        now = now or utcnow()
        query = (
            select(User.id, Assignment, Subject)
            .join(Subject, Subject.id == Assignment.subject_id)
            .join(User, User.status == UserStatus.ACTIVE)
            .where(
                User.notify_deadlines.is_(True),
                Subject.is_archived.is_(False),
                Assignment.due_at > now,
                Assignment.due_at <= now + horizon,
                ~exists().where(
                    AssignmentProgress.assignment_id == Assignment.id,
                    AssignmentProgress.user_id == User.id,
                ),
                ~exists().where(
                    ReminderLog.assignment_id == Assignment.id,
                    ReminderLog.user_id == User.id,
                    ReminderLog.kind == kind,
                ),
            )
            .order_by(Assignment.due_at)
        )
        async with self._sm() as s:
            return [(uid, a, subj) for uid, a, subj in await s.execute(query)]

    async def log_reminder(self, user_id: int, assignment_id: int, kind: str) -> None:
        async with self._sm() as s:
            await s.merge(ReminderLog(user_id=user_id, assignment_id=assignment_id, kind=kind))
            await s.commit()
