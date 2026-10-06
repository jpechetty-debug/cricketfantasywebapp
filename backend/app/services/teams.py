"""Keep one spelling per team.

Players are tied to a match by team name, compared exactly. A match typed as "BachpanAmigos11" next to
players imported as "BachpanAmigos 11" would show no players for that side, so names that differ only in
spacing, case or punctuation are treated as the same team and stored with one spelling.
"""

import logging
from collections import Counter

from sqlalchemy.orm import Session

from app.models.match import Match
from app.models.player import Player
from app.services.cricheroes import normalize_name

logger = logging.getLogger(__name__)


def team_key(name: str) -> str:
    return normalize_name(name) or name.strip().lower()


def canonical_team(db: Session, name: str) -> str:
    """The spelling already used for this team, or the given name for a new team."""
    name = " ".join(name.split())
    key = team_key(name)
    spellings = Counter(row[0] for row in db.query(Player.team_name))
    for match in db.query(Match.team_a, Match.team_b):
        spellings.update(match)
    same = [(count, spelling) for spelling, count in spellings.items() if team_key(spelling) == key]
    return max(same)[1] if same else name


def unify_team_names(db: Session) -> int:
    """Rewrite every team to its most used spelling; returns how many rows changed."""
    spellings = Counter(row[0] for row in db.query(Player.team_name))
    for match in db.query(Match.team_a, Match.team_b):
        spellings.update(match)
    best: dict[str, tuple[int, str]] = {}
    for spelling, count in spellings.items():
        key = team_key(spelling)
        best[key] = max(best.get(key, (0, "")), (count, spelling))

    changed = 0
    for player in db.query(Player):
        target = best[team_key(player.team_name)][1]
        if player.team_name != target:
            player.team_name = target
            changed += 1
    for match in db.query(Match):
        for field in ("team_a", "team_b"):
            target = best[team_key(getattr(match, field))][1]
            if getattr(match, field) != target:
                setattr(match, field, target)
                changed += 1
    if changed:
        logger.info("Unified %d team name spellings", changed)
    return changed
