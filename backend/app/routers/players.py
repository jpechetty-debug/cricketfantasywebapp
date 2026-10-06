import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_admin
from app.models.cricheroes import CricHeroesPlayerLink
from app.models.fantasy_team import FantasyTeam
from app.models.match import Match
from app.models.player import Player
from app.models.player_points import PlayerPoints
from app.models.user import User
from app.schemas.player import PlayerCreate, PlayerOut, PlayerUpdate

router = APIRouter(prefix="/players", tags=["players"])


@router.get("", response_model=list[PlayerOut])
def list_players(
    match_id: int | None = Query(default=None),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Player)
    if match_id is not None:
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
        query = query.filter(Player.team_name.in_([match.team_a, match.team_b]), Player.active.is_(True))
    return query.order_by(Player.team_name, Player.player_name).all()


@router.post("", response_model=PlayerOut)
def create_player(payload: PlayerCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    player = Player(
        player_name=payload.player_name.strip(),
        team_name=payload.team_name.strip(),
        role=payload.role.strip(),
        active=payload.active,
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


@router.put("/{player_id}", response_model=PlayerOut)
def update_player(
    player_id: int,
    payload: PlayerUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(player, key, value)
    db.commit()
    db.refresh(player)
    return player


def _player_in_use(db: Session, player_id: int) -> bool:
    if db.query(PlayerPoints.id).filter(PlayerPoints.player_id == player_id).first():
        return True
    # Narrow with a text match first, then confirm against the decoded JSON list.
    candidates = db.query(FantasyTeam.selected_players_json).filter(
        FantasyTeam.selected_players_json.contains(str(player_id))
    )
    return any(player_id in json.loads(raw) for (raw,) in candidates)


@router.delete("/{player_id}")
def delete_player(player_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    if _player_in_use(db, player_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Player is part of existing teams or scores. Mark them inactive instead",
        )
    db.query(CricHeroesPlayerLink).filter(CricHeroesPlayerLink.player_id == player_id).delete()
    db.delete(player)
    db.commit()
    return {"ok": True}
