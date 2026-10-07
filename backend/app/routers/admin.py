from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models.fantasy_team import FantasyTeam
from app.models.match import Match
from app.models.user import User
from app.routers.leaderboard import ranked_entries
from app.schemas.common import UtcOutput
from app.services.auth import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])

PODIUM = 3
RECENT_RESULTS = 10


class Winner(BaseModel):
    rank: int
    user_id: int
    name: str
    mobile: str | None
    points: float


class Member(BaseModel):
    id: int
    name: str
    mobile: str
    created_at: UtcOutput
    squads: int


class PasswordReset(BaseModel):
    password: str = Field(min_length=8, max_length=72)


class EntryMember(BaseModel):
    user_id: int
    name: str
    mobile: str
    entered_at: UtcOutput | None = None


class MatchEntries(BaseModel):
    match_id: int
    match_name: str
    team_a: str
    team_b: str
    match_date: UtcOutput
    status: str
    members: int
    entered: list[EntryMember]
    missing: list[EntryMember]


class MatchWinners(BaseModel):
    match_id: int
    match_name: str
    team_a: str
    team_b: str
    match_date: UtcOutput
    squads: int
    winners: list[Winner]


@router.get("/stats")
def stats(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return {
        "total_users": db.query(User).filter(User.role == "user").count(),
        "total_matches": db.query(Match).count(),
        "total_teams": db.query(FantasyTeam).count(),
    }


@router.get("/winners", response_model=list[MatchWinners])
def winners(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Top 3 fantasy squads of each closed match, newest first. Tied squads share a place, so a podium can hold more than 3."""
    matches = db.query(Match).filter(Match.status == "closed").order_by(Match.match_date.desc()).limit(RECENT_RESULTS).all()
    results = []
    for match in matches:
        entries = ranked_entries(db, match.id)
        podium = [e for e in entries if e.rank <= PODIUM]
        mobiles = dict(db.query(User.id, User.mobile).filter(User.id.in_([e.user_id for e in podium]))) if podium else {}
        results.append(
            MatchWinners(
                match_id=match.id,
                match_name=match.match_name,
                team_a=match.team_a,
                team_b=match.team_b,
                match_date=match.match_date,
                squads=len(entries),
                winners=[
                    Winner(rank=e.rank, user_id=e.user_id, name=e.name, mobile=mobiles.get(e.user_id), points=e.points)
                    for e in podium
                ],
            )
        )
    return results


@router.get("/users", response_model=list[Member])
def list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Everyone who signed up to play (admins excluded), newest first."""
    squads = dict(db.query(FantasyTeam.user_id, func.count(FantasyTeam.id)).group_by(FantasyTeam.user_id))
    users = db.query(User).filter(User.role == "user").order_by(User.created_at.desc(), User.id.desc()).all()
    return [Member(id=u.id, name=u.name, mobile=u.mobile, created_at=u.created_at, squads=squads.get(u.id, 0)) for u in users]


@router.delete("/users/{user_id}")
def delete_user(user_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Remove a member and their squads; they drop out of every leaderboard."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin accounts can't be deleted here")
    removed = db.query(FantasyTeam).filter(FantasyTeam.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return {"deleted": user_id, "squads_removed": removed}


@router.post("/users/{user_id}/password")
def reset_password(user_id: int, payload: PasswordReset, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Give a member who forgot their password a new one; their squads and points are untouched."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Change the admin password in Render instead")
    user.password_hash = hash_password(payload.password)
    db.commit()
    return {"ok": True}


@router.get("/entries", response_model=list[MatchEntries])
def entries(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    """For every match not yet completed (soonest first): which members have entered a squad and who still has to."""
    members = db.query(User).filter(User.role == "user").order_by(User.name).all()
    matches = db.query(Match).filter(Match.status != "closed").order_by(Match.match_date.asc()).all()
    results = []
    for match in matches:
        entered_at = dict(db.query(FantasyTeam.user_id, FantasyTeam.created_at).filter(FantasyTeam.match_id == match.id))
        entered = sorted(
            (EntryMember(user_id=u.id, name=u.name, mobile=u.mobile, entered_at=entered_at[u.id]) for u in members if u.id in entered_at),
            key=lambda m: m.entered_at,
            reverse=True,
        )
        missing = [EntryMember(user_id=u.id, name=u.name, mobile=u.mobile) for u in members if u.id not in entered_at]
        results.append(
            MatchEntries(
                match_id=match.id,
                match_name=match.match_name,
                team_a=match.team_a,
                team_b=match.team_b,
                match_date=match.match_date,
                status=match.status,
                members=len(members),
                entered=entered,
                missing=missing,
            )
        )
    return results
