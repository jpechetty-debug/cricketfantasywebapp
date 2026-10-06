from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# Kept in their own tables rather than as columns on matches/players: the app has no migrations,
# and create_all() only adds missing tables to an existing database.


class CricHeroesMatchLink(Base):
    __tablename__ = "cricheroes_match_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), nullable=False, unique=True)
    cricheroes_match_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True, index=True)


class CricHeroesPlayerLink(Base):
    """One app player maps to one CricHeroes profile; a profile may back several app players (one per team)."""

    __tablename__ = "cricheroes_player_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, unique=True)
    cricheroes_player_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
