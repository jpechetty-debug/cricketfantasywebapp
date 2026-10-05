from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.match import Match
from app.models.player import Player
from app.models.player_points import PlayerPoints
from app.models.user import User
from app.schemas.points import PointsPayload
from app.services.scoring import recalculate_match_teams

router = APIRouter(prefix="/points", tags=["points"])


@router.get("/{match_id}")
def get_points(match_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(PlayerPoints).filter(PlayerPoints.match_id == match_id).all()
    return [{"player_id": r.player_id, "points": r.points} for r in rows]


@router.post("")
def save_points(payload: PointsPayload, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == payload.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    player_ids = {entry.player_id for entry in payload.entries}
    if len(player_ids) != len(payload.entries):
        raise HTTPException(status_code=400, detail="Each player can only appear once")
    valid_ids = {
        pid
        for (pid,) in db.query(Player.id).filter(
            Player.id.in_(player_ids), Player.team_name.in_([match.team_a, match.team_b])
        )
    }
    if valid_ids != player_ids:
        raise HTTPException(status_code=400, detail="All players must belong to the match teams")
    for entry in payload.entries:
        row = (
            db.query(PlayerPoints)
            .filter(PlayerPoints.match_id == payload.match_id, PlayerPoints.player_id == entry.player_id)
            .first()
        )
        if row:
            row.points = entry.points
        else:
            db.add(PlayerPoints(match_id=payload.match_id, player_id=entry.player_id, points=entry.points))
    db.flush()
    recalculate_match_teams(db, payload.match_id)
    db.commit()
    return {"ok": True}
