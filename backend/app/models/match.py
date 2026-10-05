from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    match_name: Mapped[str] = mapped_column(String(200), nullable=False)
    team_a: Mapped[str] = mapped_column(String(120), nullable=False)
    team_b: Mapped[str] = mapped_column(String(120), nullable=False)
    match_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)
