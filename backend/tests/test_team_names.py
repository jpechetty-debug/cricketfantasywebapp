from datetime import datetime

from app.database import SessionLocal
from app.models.match import Match
from app.models.player import Player
from app.seed import seed_database


def test_startup_unifies_spellings_so_the_match_shows_its_players(client, admin_headers):
    with SessionLocal() as db:
        match = Match(match_name="Final", team_a="Smashing Sharks", team_b="BachpanAmigos11", match_date=datetime(2030, 1, 1), status="open")
        db.add(match)
        db.add_all(
            [
                Player(player_name="Prawardhan", team_name="BachpanAmigos 11", role="AR", active=True),
                Player(player_name="Raja", team_name="BachpanAmigos 11", role="BOWL", active=True),
                Player(player_name="K V Vijay", team_name="Smashing Sharks", role="AR", active=True),
            ]
        )
        db.commit()
        match_id = match.id

    shown = client.get(f"/api/players?match_id={match_id}", headers=admin_headers).json()
    assert {p["player_name"] for p in shown} == {"K V Vijay"}  # the bug

    with SessionLocal() as db:
        seed_database(db)
        assert db.get(Match, match_id).team_b == "BachpanAmigos 11"

    shown = client.get(f"/api/players?match_id={match_id}", headers=admin_headers).json()
    assert {p["player_name"] for p in shown} == {"K V Vijay", "Prawardhan", "Raja"}


def test_new_match_and_player_reuse_existing_spelling(client, admin_headers):
    r = client.post(
        "/api/players", json={"player_name": "Raja", "team_name": "BachpanAmigos 11", "role": "BOWL", "active": True}, headers=admin_headers
    )
    assert r.status_code == 200
    r = client.post(
        "/api/matches",
        json={"match_name": "Final", "team_a": "bachpanamigos11", "team_b": "Sharks", "match_date": "2030-01-01T10:00:00Z"},
        headers=admin_headers,
    )
    assert r.status_code == 200 and r.json()["team_a"] == "BachpanAmigos 11"
    r = client.post(
        "/api/players", json={"player_name": "Pran", "team_name": "Bachpan Amigos 11", "role": "AR", "active": True}, headers=admin_headers
    )
    assert r.json()["team_name"] == "BachpanAmigos 11"
