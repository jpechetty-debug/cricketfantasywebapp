from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.cricheroes import CricHeroesMatchLink
from app.models.fantasy_team import FantasyTeam
from app.models.match import Match
from app.models.player_points import PlayerPoints
from app.models.user import User
from app.schemas.match import MatchCreate, MatchOut, MatchStatusUpdate, MatchTimeUpdate
from app.services.teams import canonical_team

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=list[MatchOut])
def list_matches(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Match).order_by(Match.match_date.desc()).all()


@router.get("/{match_id}", response_model=MatchOut)
def get_match(match_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    return match


@router.post("", response_model=MatchOut)
def create_match(payload: MatchCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    match = Match(
        match_name=payload.match_name.strip(),
        team_a=canonical_team(db, payload.team_a),
        team_b=canonical_team(db, payload.team_b),
        match_date=payload.match_date,
        status="open",
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.patch("/{match_id}/status", response_model=MatchOut)
def update_match_status(
    match_id: int,
    payload: MatchStatusUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    match.status = payload.status
    db.commit()
    db.refresh(match)
    return match


@router.patch("/{match_id}/time", response_model=MatchOut)
def update_match_time(
    match_id: int,
    payload: MatchTimeUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Move the start time; squads stay editable until it (while the match is open)."""
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    match.match_date = payload.match_date
    db.commit()
    db.refresh(match)
    return match


@router.delete("/{match_id}")
def delete_match(match_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Remove a match with its squads, points and CricHeroes link. Players stay in the pool."""
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    squads = db.query(FantasyTeam).filter(FantasyTeam.match_id == match_id).delete(synchronize_session=False)
    db.query(PlayerPoints).filter(PlayerPoints.match_id == match_id).delete(synchronize_session=False)
    db.query(CricHeroesMatchLink).filter(CricHeroesMatchLink.match_id == match_id).delete(synchronize_session=False)
    db.delete(match)
    db.commit()
    return {"deleted": match_id, "squads_removed": squads}
