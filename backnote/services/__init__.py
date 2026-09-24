from dataclasses import dataclass

from sqlalchemy.ext.asyncio import async_sessionmaker

from backnote.services.catalog import LessonService, MaterialService, SubjectService
from backnote.services.progress import ProgressService
from backnote.services.users import UserService


@dataclass(frozen=True)
class Services:
    users: UserService
    subjects: SubjectService
    lessons: LessonService
    materials: MaterialService
    progress: ProgressService

    @classmethod
    def create(cls, sessionmaker: async_sessionmaker, admin_id: int) -> "Services":
        return cls(
            users=UserService(sessionmaker, admin_id),
            subjects=SubjectService(sessionmaker),
            lessons=LessonService(sessionmaker),
            materials=MaterialService(sessionmaker),
            progress=ProgressService(sessionmaker),
        )


__all__ = ["Services"]
