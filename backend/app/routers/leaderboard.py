from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.fantasy_team import FantasyTeam
from app.models.match import Match
from app.models.user import User
from app.schemas.leaderboard import LeaderboardEntry
from app.services.scoring import calculate_team_points, player_score_map

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/{match_id}", response_model=list[LeaderboardEntry])
def leaderboard(match_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    scores = player_score_map(db, match_id)
    rows = (
        db.query(FantasyTeam, User.name)
        .outerjoin(User, User.id == FantasyTeam.user_id)
        .filter(FantasyTeam.match_id == match_id)
        .all()
    )
    entries = [
        LeaderboardEntry(
            rank=0,
            user_id=team.user_id,
            name=owner_name or "Unknown",
            points=calculate_team_points(team, scores),
            team_id=team.id,
        )
        for team, owner_name in rows
    ]
    entries.sort(key=lambda e: (-e.points, e.team_id))
    # Standard competition ranking: tied scores share a rank (1, 1, 3, ...).
    for index, entry in enumerate(entries):
        tied = index > 0 and entry.points == entries[index - 1].points
        entry.rank = entries[index - 1].rank if tied else index + 1
    return entries
