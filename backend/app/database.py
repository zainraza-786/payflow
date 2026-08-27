"""
Database setup.

Uses SQLAlchemy with a URL pulled from configuration. SQLite is used
for Phase 1. The engine/session setup is written so that swapping
DATABASE_URL to a PostgreSQL URL later requires no code changes here.
"""

from datetime import datetime, timezone
from sqlalchemy import create_engine, event, DateTime, TypeDecorator
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

connect_args = {}
if settings.database_url.startswith("sqlite"):
    # Required for SQLite when used with FastAPI's threaded request handling.
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


class UTCDateTime(TypeDecorator):
    """SQLAlchemy type decorator to ensure datetimes are persisted and retrieved as timezone-aware UTC datetimes."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            else:
                value = value.astimezone(timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            else:
                value = value.astimezone(timezone.utc)
        return value


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes the database tables on application startup."""
    # Import models so Base metadata is populated before create_all runs.
    from app.models import payment, recovery_attempt, audit_log  # noqa: F401

    Base.metadata.create_all(bind=engine)

