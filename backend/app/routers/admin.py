from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models.fantasy_team import FantasyTeam
from app.models.match import Match
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def stats(_: User = Depends(require_admin), db: Session = Depends(get_db)):
    return {
        "total_users": db.query(User).filter(User.role == "user").count(),
        "total_matches": db.query(Match).count(),
        "total_teams": db.query(FantasyTeam).count(),
    }
