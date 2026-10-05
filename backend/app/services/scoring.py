import json

from sqlalchemy.orm import Session

from app.models.fantasy_team import FantasyTeam
from app.models.player_points import PlayerPoints


def player_score_map(db: Session, match_id: int) -> dict[int, float]:
    rows = db.query(PlayerPoints).filter(PlayerPoints.match_id == match_id).all()
    return {row.player_id: row.points for row in rows}


def calculate_team_points(team: FantasyTeam, scores: dict[int, float]) -> float:
    player_ids = json.loads(team.selected_players_json)
    total = 0.0
    for pid in player_ids:
        base = scores.get(int(pid), 0.0)
        if int(pid) == team.captain_id:
            total += base * 2.0
        elif int(pid) == team.vice_captain_id:
            total += base * 1.5
        else:
            total += base
    return round(total, 2)


def recalculate_match_teams(db: Session, match_id: int) -> None:
    scores = player_score_map(db, match_id)
    teams = db.query(FantasyTeam).filter(FantasyTeam.match_id == match_id).all()
    for team in teams:
        team.total_points = calculate_team_points(team, scores)
