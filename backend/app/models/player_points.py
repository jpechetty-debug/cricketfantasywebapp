from sqlalchemy import Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PlayerPoints(Base):
    __tablename__ = "player_points"
    __table_args__ = (UniqueConstraint("match_id", "player_id", name="uq_match_player_points"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, index=True)
    points: Mapped[float] = mapped_column(Float, nullable=False)
