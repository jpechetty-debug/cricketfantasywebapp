import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.services.scoring import calculate_team_points
from tests.conftest import alternate_teams, give_points


def test_captain_and_vice_multipliers():
    team = SimpleNamespace(selected_players_json=json.dumps([1, 2, 3]), captain_id=1, vice_captain_id=2)
    assert calculate_team_points(team, {1: 10, 2: 10, 3: 10}) == 45.0


def _players(client, headers, match_id):
    return alternate_teams(client.get("/api/players", params={"match_id": match_id}, headers=headers).json())


def _team_payload(match_id, players):
    ids = [p["id"] for p in players[:7]]
    return {"match_id": match_id, "selected_players": ids, "captain_id": ids[0], "vice_captain_id": ids[1]}


@pytest.fixture()
def match_id(client, user_headers):
    return client.get("/api/matches", headers=user_headers).json()[0]["id"]


def test_create_and_update_team(client, user_headers, match_id):
    players = _players(client, user_headers, match_id)
    r = client.post("/api/teams", json=_team_payload(match_id, players), headers=user_headers)
    assert r.status_code == 200, r.text
    team_id = r.json()["id"]

    r = client.post("/api/teams", json=_team_payload(match_id, players[1:]), headers=user_headers)
    assert r.status_code == 200
    assert r.json()["id"] == team_id
    assert len(client.get("/api/teams/me", headers=user_headers).json()) == 1


@pytest.mark.parametrize(
    "mutate, detail",
    [
        (lambda p: {**p, "selected_players": p["selected_players"][:6] + [p["selected_players"][0]]}, "unique"),
        (lambda p: {**p, "vice_captain_id": p["captain_id"]}, "different"),
        (lambda p: {**p, "captain_id": 99999}, "Captain"),
    ],
)
def test_invalid_teams_rejected(client, user_headers, match_id, mutate, detail):
    payload = mutate(_team_payload(match_id, _players(client, user_headers, match_id)))
    r = client.post("/api/teams", json=payload, headers=user_headers)
    assert r.status_code == 400
    assert detail in r.json()["detail"]


def test_locked_match_rejects_edits(client, user_headers, admin_headers, match_id):
    players = _players(client, user_headers, match_id)
    client.patch(f"/api/matches/{match_id}/status", json={"status": "locked"}, headers=admin_headers)
    r = client.post("/api/teams", json=_team_payload(match_id, players), headers=user_headers)
    assert r.status_code == 400


def test_match_auto_locks_after_start_time(client, user_headers, admin_headers):
    past = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    r = client.post(
        "/api/matches",
        json={"match_name": "Old game", "team_a": "Team A", "team_b": "Team B", "match_date": past},
        headers=admin_headers,
    )
    assert r.status_code == 200
    new_id = r.json()["id"]
    payload = _team_payload(new_id, _players(client, user_headers, new_id))
    assert client.post("/api/teams", json=payload, headers=user_headers).status_code == 400


def test_points_update_leaderboard(client, user_headers, admin_headers, match_id):
    payload = _team_payload(match_id, _players(client, user_headers, match_id))
    client.post("/api/teams", json=payload, headers=user_headers)

    give_points(match_id, {pid: 10 for pid in payload["selected_players"]})

    board = client.get(f"/api/leaderboard/{match_id}", headers=user_headers).json()
    assert board[0]["points"] == 20 + 15 + 50
    assert board[0]["rank"] == 1
    assert client.get("/api/teams/me", headers=user_headers).json()[0]["total_points"] == 85


def test_nobody_can_enter_points_by_hand(client, admin_headers, match_id):
    body = {"match_id": match_id, "entries": [{"player_id": 1, "points": 5}]}
    assert client.post("/api/points", json=body, headers=admin_headers).status_code in (404, 405)
    assert client.get(f"/api/points/{match_id}", headers=admin_headers).json() == []


def test_admin_deletes_a_match_with_its_squads_and_points(client, user_headers, admin_headers, match_id):
    payload = _team_payload(match_id, _players(client, user_headers, match_id))
    assert client.post("/api/teams", json=payload, headers=user_headers).status_code == 200
    give_points(match_id, {pid: 10 for pid in payload["selected_players"]})

    assert client.delete(f"/api/matches/{match_id}", headers=user_headers).status_code == 403
    r = client.delete(f"/api/matches/{match_id}", headers=admin_headers)
    assert r.status_code == 200 and r.json()["squads_removed"] == 1
    assert client.get(f"/api/matches/{match_id}", headers=admin_headers).status_code == 404
    assert client.get("/api/teams/me", headers=user_headers).json() == []
    assert client.get(f"/api/points/{match_id}", headers=admin_headers).json() == []
    # Players are kept for other fixtures.
    assert client.get("/api/players", headers=admin_headers).json()
    assert client.delete(f"/api/matches/{match_id}", headers=admin_headers).status_code == 404


def test_cannot_delete_player_in_use(client, user_headers, admin_headers, match_id):
    players = _players(client, user_headers, match_id)
    payload = _team_payload(match_id, players)
    client.post("/api/teams", json=payload, headers=user_headers)
    r = client.delete(f"/api/players/{payload['selected_players'][0]}", headers=admin_headers)
    assert r.status_code == 409
    assert client.delete(f"/api/players/{players[-1]['id']}", headers=admin_headers).status_code == 200


def test_unknown_api_path_is_404(client):
    assert client.get("/api/nope").status_code == 404


def test_at_most_four_players_from_one_team(client, user_headers, match_id):
    players = _players(client, user_headers, match_id)
    team_a = [p for p in players if p["team_name"] == players[0]["team_name"]]
    team_b = [p for p in players if p["team_name"] != players[0]["team_name"]]
    r = client.post("/api/teams", json=_team_payload(match_id, team_a[:5] + team_b[:2]), headers=user_headers)
    assert r.status_code == 400 and "at most 4" in r.json()["detail"]
    r = client.post("/api/teams", json=_team_payload(match_id, team_a[:4] + team_b[:3]), headers=user_headers)
    assert r.status_code == 200, r.text
