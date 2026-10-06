import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db, utcnow
from app.deps import get_current_user
from app.models.fantasy_team import FantasyTeam
from app.models.match import Match
from app.models.player import Player
from app.models.user import User
from app.schemas.team import TeamCreate, TeamOut
from app.services.scoring import calculate_team_points, player_score_map

router = APIRouter(prefix="/teams", tags=["teams"])

SQUAD_SIZE = 7
MAX_PER_TEAM = 4


def serialize_team(team: FantasyTeam, user_name: str | None = None, match_name: str | None = None) -> TeamOut:
    return TeamOut(
        id=team.id,
        user_id=team.user_id,
        match_id=team.match_id,
        captain_id=team.captain_id,
        vice_captain_id=team.vice_captain_id,
        selected_players=json.loads(team.selected_players_json),
        total_points=team.total_points,
        created_at=team.created_at,
        user_name=user_name,
        match_name=match_name,
    )


def is_match_open(match: Match) -> bool:
    return match.status == "open" and match.match_date > utcnow()


def validate_team_payload(db: Session, match: Match, payload: TeamCreate) -> None:
    if len(set(payload.selected_players)) != 7:
        raise HTTPException(status_code=400, detail="Select exactly 7 unique players")
    if payload.captain_id not in payload.selected_players:
        raise HTTPException(status_code=400, detail="Captain must be one of the selected players")
    if payload.vice_captain_id not in payload.selected_players:
        raise HTTPException(status_code=400, detail="Vice captain must be one of the selected players")
    if payload.captain_id == payload.vice_captain_id:
        raise HTTPException(status_code=400, detail="Captain and vice captain must be different")
    players = db.query(Player).filter(Player.id.in_(payload.selected_players), Player.active.is_(True)).all()
    if len(players) != 7:
        raise HTTPException(status_code=400, detail="All selected players must be active and valid")
    allowed = {match.team_a, match.team_b}
    if any(p.team_name not in allowed for p in players):
        raise HTTPException(status_code=400, detail="Players must belong to the match teams")
    for team in allowed:
        if sum(p.team_name == team for p in players) > MAX_PER_TEAM:
            raise HTTPException(status_code=400, detail=f"Pick at most {MAX_PER_TEAM} players from {team}")


@router.post("", response_model=TeamOut)
def create_or_update_team(
    payload: TeamCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Admins cannot create fantasy teams")
    match = db.query(Match).filter(Match.id == payload.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if not is_match_open(match):
        raise HTTPException(status_code=400, detail="Match is locked. Teams can no longer be edited")
    validate_team_payload(db, match, payload)

    existing = (
        db.query(FantasyTeam)
        .filter(FantasyTeam.user_id == user.id, FantasyTeam.match_id == payload.match_id)
        .first()
    )
    scores = player_score_map(db, payload.match_id)
    if existing:
        existing.captain_id = payload.captain_id
        existing.vice_captain_id = payload.vice_captain_id
        existing.selected_players_json = json.dumps(payload.selected_players)
        existing.total_points = calculate_team_points(existing, scores)
        db.commit()
        db.refresh(existing)
        return serialize_team(existing, user.name, match.match_name)

    team = FantasyTeam(
        user_id=user.id,
        match_id=payload.match_id,
        captain_id=payload.captain_id,
        vice_captain_id=payload.vice_captain_id,
        selected_players_json=json.dumps(payload.selected_players),
        total_points=0,
    )
    team.total_points = calculate_team_points(team, scores)
    db.add(team)
    try:
        db.commit()
    except IntegrityError:
        # A concurrent request from the same user created the team first.
        db.rollback()
        raise HTTPException(status_code=409, detail="Team was just saved from another session. Please reload")
    db.refresh(team)
    return serialize_team(team, user.name, match.match_name)


@router.get("/me", response_model=list[TeamOut])
def my_teams(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(FantasyTeam, Match.match_name)
        .outerjoin(Match, Match.id == FantasyTeam.match_id)
        .filter(FantasyTeam.user_id == user.id)
        .order_by(FantasyTeam.created_at.desc())
        .all()
    )
    return [serialize_team(team, user.name, match_name) for team, match_name in rows]


@router.get("/match/{match_id}", response_model=TeamOut | None)
def my_team_for_match(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    team = (
        db.query(FantasyTeam)
        .filter(FantasyTeam.user_id == user.id, FantasyTeam.match_id == match_id)
        .first()
    )
    if not team:
        return None
    match = db.query(Match).filter(Match.id == match_id).first()
    return serialize_team(team, user.name, match.match_name if match else None)
