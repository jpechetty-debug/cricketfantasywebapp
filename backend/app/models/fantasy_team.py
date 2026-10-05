from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, utcnow


class FantasyTeam(Base):
    __tablename__ = "fantasy_teams"
    __table_args__ = (UniqueConstraint("user_id", "match_id", name="uq_user_match_team"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False, index=True)
    captain_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    vice_captain_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False)
    selected_players_json: Mapped[str] = mapped_column(Text, nullable=False)
    total_points: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
