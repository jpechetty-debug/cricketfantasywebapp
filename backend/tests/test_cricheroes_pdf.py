import base64

import pytest

from app.services import cricheroes_pdf
from app.services.cricheroes import CricHeroesError
from app.services.cricheroes_pdf import parse_scorecard_text, synthetic_player_id
from app.services.fantasy_points import score_match, total

# Text shaped like pypdf's output for a CricHeroes scorecard PDF, including its quirks: headings glued to
# the previous line, capitals split from their word ("V ijay"), the keeper dagger as U+FFFD and a super over.
TEXT = """�
SOME CUP (Final)
10/6/26, 6:13 AM cricher oes.com 1 of 4Match Details
MatchSharks vs
Amigos 11
Ground City Ground
Date 2026-05-24, 13:46 PM UTCMatch Result
Result Match T ied (Amigos 11 won the super over)
�
SOME CUP (Final)
10/6/26, 6:13 AM cricher oes.com 2 of 4Playing Squad
Amigos 11
 Sharks
1
 Pran ( C )
 Suresh Reddy ( C )
2
 Arun Kumar ( WK )
 K V V ijay
3
 Dual Player
 Dual Player
4
 Kiran
 Bobby ( WK )
�
SOME CUP (Final)
10/6/26, 6:13 AM cricher oes.com 3 of 4Sharks 120/2 (10.0 Ov) (1st Innings) Suresh Reddy (Sharks)
No Batsman Status RB M 4s 6s SR
1 Bobby (wk) (RHB) c �Arun Kumar b Pran 30 20 25 4 1 150.00
2 K V VIJA Y (RHB) not out 52 30 40 6 2 173.33
3 Suresh Reddy (c) (LHB) b Kiran 0 1 1 0 0 0.00
Extras: (wd 20) 38
Total: Overs 10.0, Wickets 2 120 (CRR: 12.00)
To Bat: Dual Player
Fall of W ickets
50-1 (Bobby, 4.1 ov), 60-2 (Suresh Reddy , 5 ov)No Bowler O M R W 0s 4s 6s WD NB Eco
1 Pran (c) 5 1 50 1 10 4 1 2 0 10.00
2 Kiran 5 0 70 1 8 6 2 0 0 14.00
SOME CUP (Final)
10/6/26, 6:13 AM cricher oes.com 4 of 4Amigos 11 120/5 (10.0 Ov) (1st Innings) Pran (Amigos 11)
No Batsman Status RBM4s 6s SR
1 Arun Kumar (wk) (RHB) run out (Bobby/K V VIJA Y) 40 25 30 5 0 160.00
2 Pran (c) (RHB) c K V VIJA Y b Suresh Reddy 80 35 40 8 4 228.57
3 Dual Player (RHB) not out 0 0 1 0 0 0.00
Extras: 0
Total: Overs 10.0, Wickets 2 120 (CRR: 12.00)
To Bat: Kiran
Fall of W ickets
-No Bowler O M R W 0s 4s 6s WD NB Eco
1 Suresh Reddy (c) 6 0 60 1 4 5 2 0 0 10.00
2 K V VIJA Y 4 0 60 0 2 6 2 0 0 15.00
Amigos 11 6/1 (1.0 Ov) (2nd Innings) Pran (Amigos 11)
No Batsman Status R B M 4s 6s SR
1 Pran c �Bobby b K V Vijay 6 3 0 1 0 200.00
Extras: 0
Total: Overs 1.0, Wickets 1 6 (CRR: -)
To Bat:
Fall of W ickets
-No Bowler O M R W 0s 4s 6s WD NB Eco
1 K V Vijay 1.0 0 6 1 0 0 0 0 0 6.00
"""


def players_by_name(match):
    return {p.name: p for p in match.players}


def test_reads_match_details():
    match = parse_scorecard_text(TEXT, 777)
    assert (match.team_a.name, match.team_b.name) == ("Sharks", "Amigos 11")
    assert match.cricheroes_match_id == 777 and match.status == "past" and match.has_scorecard
    assert match.tournament_name == "SOME CUP (Final)"
    assert match.result == "Match Tied (Amigos 11 won the super over)"
    assert match.start_time.isoformat() == "2026-05-24T13:46:00"


def test_reads_players_with_squad_names_and_teams():
    match = parse_scorecard_text(TEXT, 777)
    players = players_by_name(match)
    assert set(players) == {"Bobby", "K V Vijay", "Suresh Reddy", "Dual Player", "Pran", "Kiran", "Arun Kumar"}
    vijay = players["K V Vijay"]
    assert vijay.team_id == match.team_a.cricheroes_team_id
    assert vijay.cricheroes_player_id == synthetic_player_id("K V VIJA Y") < 0
    assert players["Bobby"].is_keeper and players["Arun Kumar"].is_keeper and not players["Pran"].is_keeper
    # Listed in both squads and in Sharks' to-bat list, but batted for Amigos 11.
    assert players["Dual Player"].team_id == match.team_b.cricheroes_team_id
    assert players["Kiran"].team_id == match.team_b.cricheroes_team_id


def test_empty_to_bat_list_does_not_read_the_next_heading_as_a_player():
    # An all-out side has nobody left to bat, so its "To Bat:" line is empty.
    match = parse_scorecard_text(TEXT.replace("To Bat: Dual Player", "To Bat:"), 777)
    assert set(players_by_name(match)) == {"Bobby", "K V Vijay", "Suresh Reddy", "Dual Player", "Pran", "Kiran", "Arun Kumar"}


def test_super_over_is_ignored():
    players = players_by_name(parse_scorecard_text(TEXT, 777))
    assert [(b.runs, b.balls) for b in players["Pran"].batting] == [(80, 35)]
    assert [b.wickets for b in players["K V Vijay"].bowling] == [0]


def test_points_resolve_fielders_despite_pdf_spacing():
    match = parse_scorecard_text(TEXT, 777)
    lines, warnings = score_match(match)
    assert warnings == []
    by_name = {p.name: lines[p.cricheroes_player_id] for p in match.players}
    assert "Catch" in {line.label for line in by_name["Arun Kumar"]}
    assert "Run out" in {line.label for line in by_name["K V Vijay"]}
    assert "Duck" in {line.label for line in by_name["Suresh Reddy"]}
    assert total(by_name["Kiran"]) == 4 + 25 + 8  # playing, wicket, bowled bonus


def test_rejects_non_scorecards():
    with pytest.raises(CricHeroesError, match="does not look like"):
        parse_scorecard_text("Some invoice\nTotal 100", 1)
    with pytest.raises(CricHeroesError, match="not a PDF"):
        cricheroes_pdf.extract_text(b"hello")


@pytest.fixture()
def fake_pdf(monkeypatch):
    monkeypatch.setattr(cricheroes_pdf, "extract_text", lambda data: TEXT)
    return base64.b64encode(b"%PDF-1.4 fake").decode()


def test_pdf_preview_requires_admin(client, user_headers, fake_pdf):
    r = client.post("/api/cricheroes/pdf/preview", json={"pdf_base64": fake_pdf, "filename": "Scorecard_777.pdf"}, headers=user_headers)
    assert r.status_code == 403


def test_pdf_preview_needs_a_match_id(client, admin_headers, fake_pdf):
    r = client.post("/api/cricheroes/pdf/preview", json={"pdf_base64": fake_pdf, "filename": "scorecard.pdf"}, headers=admin_headers)
    assert r.status_code == 400 and "match link" in r.json()["detail"]
    r = client.post(
        "/api/cricheroes/pdf/preview",
        json={"pdf_base64": fake_pdf, "filename": "scorecard.pdf", "url": "https://cricheroes.com/scorecard/777/x/y"},
        headers=admin_headers,
    )
    assert r.status_code == 200 and r.json()["cricheroes_match_id"] == 777


def test_pdf_import_creates_match_and_remembers_players(client, admin_headers, fake_pdf):
    body = {"pdf_base64": fake_pdf, "filename": "Scorecard_777 (1).pdf"}
    preview = client.post("/api/cricheroes/pdf/preview", json=body, headers=admin_headers).json()
    assert preview["match_id"] is None and len(preview["players"]) == 7
    players = [
        {"cricheroes_player_id": p["cricheroes_player_id"], "player_id": None, "role": p["suggested_role"]}
        for p in preview["players"]
    ]
    r = client.post("/api/cricheroes/pdf/import", json={**body, "players": players}, headers=admin_headers)
    assert r.status_code == 200, r.text
    result = r.json()
    assert result["created_match"] and result["players_created"] == 7 and result["points_saved"] == 7

    lines, _ = score_match(parse_scorecard_text(TEXT, 777))
    saved = client.get(f"/api/points/{result['match_id']}", headers=admin_headers).json()
    assert sorted(p["points"] for p in saved) == sorted(total(points) for points in lines.values())

    # Importing the same PDF again finds the match and recognises every player.
    again = client.post("/api/cricheroes/pdf/preview", json=body, headers=admin_headers).json()
    assert again["match_id"] == result["match_id"]
    assert {p["match_reason"] for p in again["players"]} == {"linked"}


def test_pdf_name_matches_player_linked_from_a_link_import_and_keeps_real_id(client, admin_headers, fake_pdf):
    from app.database import SessionLocal
    from app.models.cricheroes import CricHeroesPlayerLink
    from app.models.player import Player

    with SessionLocal() as db:
        pran = Player(player_name="Pran", team_name="Amigos 11", role="AR", active=True)
        db.add(pran)
        db.flush()
        db.add(CricHeroesPlayerLink(player_id=pran.id, cricheroes_player_id=4242))
        db.commit()
        pran_id = pran.id

    body = {"pdf_base64": fake_pdf, "filename": "Scorecard_777.pdf"}
    preview = client.post("/api/cricheroes/pdf/preview", json=body, headers=admin_headers).json()
    row = next(p for p in preview["players"] if p["name"] == "Pran")
    assert (row["player_id"], row["match_reason"]) == (pran_id, "name")

    players = [
        {"cricheroes_player_id": p["cricheroes_player_id"], "player_id": p["player_id"], "role": p["suggested_role"]}
        for p in preview["players"]
    ]
    assert client.post("/api/cricheroes/pdf/import", json={**body, "players": players}, headers=admin_headers).status_code == 200
    with SessionLocal() as db:
        link = db.query(CricHeroesPlayerLink).filter(CricHeroesPlayerLink.player_id == pran_id).one()
        assert link.cricheroes_player_id == 4242
