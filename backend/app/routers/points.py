from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.player_points import PlayerPoints
from app.models.user import User

# Points are read-only here: they only come from a CricHeroes import (link or scorecard PDF), never typed in by hand.
router = APIRouter(prefix="/points", tags=["points"])


@router.get("/{match_id}")
def get_points(match_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(PlayerPoints).filter(PlayerPoints.match_id == match_id).all()
    return [{"player_id": r.player_id, "points": r.points} for r in rows]
