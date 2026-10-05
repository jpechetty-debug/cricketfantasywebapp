import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.services.scoring import calculate_team_points


def test_captain_and_vice_multipliers():
    team = SimpleNamespace(selected_players_json=json.dumps([1, 2, 3]), captain_id=1, vice_captain_id=2)
    assert calculate_team_points(team, {1: 10, 2: 10, 3: 10}) == 45.0


def _players(client, headers, match_id):
    return client.get("/api/players", params={"match_id": match_id}, headers=headers).json()


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

    entries = [{"player_id": pid, "points": 10} for pid in payload["selected_players"]]
    r = client.post("/api/points", json={"match_id": match_id, "entries": entries}, headers=admin_headers)
    assert r.status_code == 200

    board = client.get(f"/api/leaderboard/{match_id}", headers=user_headers).json()
    assert board[0]["points"] == 20 + 15 + 50
    assert board[0]["rank"] == 1
    assert client.get("/api/teams/me", headers=user_headers).json()[0]["total_points"] == 85


def test_points_reject_players_outside_match(client, admin_headers, match_id):
    r = client.post(
        "/api/points", json={"match_id": match_id, "entries": [{"player_id": 99999, "points": 5}]}, headers=admin_headers
    )
    assert r.status_code == 400


def test_cannot_delete_player_in_use(client, user_headers, admin_headers, match_id):
    players = _players(client, user_headers, match_id)
    payload = _team_payload(match_id, players)
    client.post("/api/teams", json=payload, headers=user_headers)
    r = client.delete(f"/api/players/{payload['selected_players'][0]}", headers=admin_headers)
    assert r.status_code == 409
    assert client.delete(f"/api/players/{players[-1]['id']}", headers=admin_headers).status_code == 200


def test_unknown_api_path_is_404(client):
    assert client.get("/api/nope").status_code == 404
