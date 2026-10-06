from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models.fantasy_team import FantasyTeam
from app.models.match import Match
from app.models.user import User
from app.routers.leaderboard import ranked_entries
from app.schemas.common import UtcOutput

router = APIRouter(prefix="/admin", tags=["admin"])

PODIUM = 3
RECENT_RESULTS = 10


class Winner(BaseModel):
    rank: int
    user_id: int
    name: str
    mobile: str | None
    points: float


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
