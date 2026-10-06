import json

import pytest

from app.services import cricheroes
from app.services.cricheroes import CricHeroesError, parse_match_id, parse_match_page
from app.services.fantasy_points import parse_dismissal, score_match, total
from tests.conftest import alternate_teams

URL = "https://cricheroes.com/scorecard/555/some-cup/team-a-vs-team-b/scorecard"


def _bat(pid, name, runs, how, balls=10, fours=0, sixes=0):
    return {"player_id": pid, "name": name, "runs": runs, "balls": balls, "4s": fours, "6s": sixes, "how_to_out": how}


def _bowl(pid, name, wickets, maidens=0, overs="2"):
    return {"player_id": pid, "name": name, "overs": overs, "maidens": maidens, "runs": 12, "wickets": wickets}


def page(status="past", with_scorecard=True, team_a="Team A", team_b="Team B", extra_innings=()) -> str:
    """A minimal page shaped like a CricHeroes Next.js scorecard: JSON split across RSC push chunks."""
    summary = {
        "status": True,
        "data": {
            "match_id": 555,
            "status": status,
            "start_datetime": "2026-09-06T04:47:00.000Z",
            "tournament_name": "Some Cup",
            "winning_team": team_b,
            "win_by": "8 wickets",
            "team_a": {"id": 10, "name": team_a},
            "team_b": {"id": 20, "name": team_b},
        },
    }
    innings = [
        {
            "team_id": 10,
            "teamName": team_a,
            "batting": [
                _bat(101, "Player 1  (c & wk)", 52, "c Player 13 b Player 18", fours=4, sixes=2),
                _bat(102, "Player 2", 0, "b Player 18"),
                _bat(103, "Player 3", 7, "not out"),
            ],
            "to_be_bat": [{"player_id": 104, "name": "Player 4"}],
            "bowling": [_bowl(118, "Player 18", 2, maidens=1), _bowl(119, "Player 19", 0)],
        },
        {
            "team_id": 20,
            "teamName": team_b,
            "batting": [
                _bat(113, "Player 13", 31, "st †Player 1 b Player 4"),
                _bat(118, "Player 18", 3, "run out (Player 3/Player 2)"),
            ],
            "to_be_bat": [],
            "bowling": [_bowl(104, "Player 4", 1)],
        },
        *extra_innings,
    ]
    body = {"tab": "scorecard", "summaryData": summary}
    if with_scorecard:
        body["scoreCardData"] = innings
    text = json.dumps(body)
    half = len(text) // 2
    chunks = "".join(
        f"<script>self.__next_f.push([1,{json.dumps(part)}])</script>" for part in ("2:" + text[:half], text[half:])
    )
    return f"<html><head><title>Team A vs Team B</title></head><body>{chunks}</body></html>"


@pytest.fixture()
def fake_page(monkeypatch):
    pages = {"html": page()}
    monkeypatch.setattr(cricheroes, "fetch_match", lambda match_id: parse_match_page(pages["html"], match_id))
    return pages


def test_parse_match_id_accepts_links_and_ids():
    assert parse_match_id(URL) == 555
    assert parse_match_id("cricheroes.com/scorecard/987/x/summary") == 987
    assert parse_match_id(" 42 ") == 42
    with pytest.raises(CricHeroesError):
        parse_match_id("https://evil.example.com/scorecard/1/x")


def test_parse_page_reads_teams_players_and_stats():
    match = parse_match_page(page(), 555)
    assert (match.team_a.name, match.team_b.name, match.status) == ("Team A", "Team B", "past")
    assert match.result == "Team B won by 8 wickets"
    players = {p.cricheroes_player_id: p for p in match.players}
    assert players[101].name == "Player 1" and players[101].is_keeper
    assert players[104].team_id == 10 and players[104].batting == []
    assert players[118].team_id == 20 and players[118].bowling[0].wickets == 2


def test_super_over_is_ignored_and_played_side_wins():
    super_over = {
        "team_id": 10,
        "inning": {"inning": 3, "super_over_number": 1},
        "batting": [_bat(101, "Player 1", 6, "not out")],
        "to_be_bat": [],
        "bowling": [_bowl(118, "Player 18", 1, overs="1.0")],
    }
    html = page(extra_innings=[super_over])
    # Player 13 is also listed in Team A's to-bat list, but batted for Team B.
    html = html.replace('{\\"player_id\\": 104, \\"name\\": \\"Player 4\\"}', '{\\"player_id\\": 104, \\"name\\": \\"Player 4\\"}, {\\"player_id\\": 113, \\"name\\": \\"Player 13\\"}')
    assert "Player 13" in html.split("to_be_bat", 1)[1].split("bowling", 1)[0]
    players = {p.cricheroes_player_id: p for p in parse_match_page(html, 555).players}
    assert [b.runs for b in players[101].batting] == [52]
    assert [b.wickets for b in players[118].bowling] == [2]
    assert players[113].team_id == 20


def test_missing_match_is_reported():
    with pytest.raises(CricHeroesError, match="not found"):
        parse_match_page("<title>CricHeroes: 410</title>", 1)


@pytest.mark.parametrize(
    "text, kind, fielders, bowler",
    [
        ("c X Y b Z", "caught", ["X Y"], "Z"),
        ("c&b Z", "caught", ["Z"], "Z"),
        ("c (sub) X b Z", "caught", ["X"], "Z"),
        ("st †K b Z", "stumped", ["K"], "Z"),
        ("lbw b Z", "lbw", [], "Z"),
        ("run out (A/B)", "run_out", ["A", "B"], None),
        ("retired hurt", "not_out", [], None),
    ],
)
def test_parse_dismissal(text, kind, fielders, bowler):
    d = parse_dismissal(text)
    assert (d.kind, d.fielders, d.bowler) == (kind, fielders, bowler)


def test_fantasy_points():
    lines, warnings = score_match(parse_match_page(page(), 555))
    assert warnings == []
    # 4 playing + 52 runs + 4 fours + 2*2 sixes + 8 fifty + 12 stumping
    assert total(lines[101]) == 84
    assert total(lines[102]) == 4 - 2 + 6  # duck, then shared run out
    # 4 playing + 3 runs + 2 wickets (50) + 1 maiden (12) + 8 bowled bonus
    assert total(lines[118]) == 77
    assert total(lines[113]) == 4 + 31 + 4 + 8  # 30-run bonus and a catch
    assert total(lines[103]) == 4 + 7 + 6
    assert total(lines[104]) == 4 + 25


def _preview(client, admin_headers, **extra):
    r = client.post("/api/cricheroes/preview", json={"url": URL, **extra}, headers=admin_headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_preview_requires_admin(client, user_headers, fake_page):
    assert client.post("/api/cricheroes/preview", json={"url": URL}, headers=user_headers).status_code == 403


def test_preview_matches_existing_players_by_name(client, admin_headers, fake_page):
    match_id = client.get("/api/matches", headers=admin_headers).json()[0]["id"]
    data = _preview(client, admin_headers, match_id=match_id)
    assert data["team_a"]["app_team_name"] == "Team A"
    by_id = {p["cricheroes_player_id"]: p for p in data["players"]}
    assert all(p["match_reason"] == "name" for p in data["players"])
    assert by_id[101]["suggested_role"] == "WK" and by_id[101]["points"] == 84


def test_import_into_existing_match_saves_points_and_links(client, admin_headers, user_headers, fake_page):
    match_id = client.get("/api/matches", headers=user_headers).json()[0]["id"]
    players = alternate_teams(client.get("/api/players", params={"match_id": match_id}, headers=user_headers).json())
    ids = [p["id"] for p in players[:7]]
    team = {"match_id": match_id, "selected_players": ids, "captain_id": ids[0], "vice_captain_id": ids[1]}
    assert client.post("/api/teams", json=team, headers=user_headers).status_code == 200

    preview = _preview(client, admin_headers, match_id=match_id)
    entries = [{"cricheroes_player_id": p["cricheroes_player_id"], "player_id": p["player_id"]} for p in preview["players"]]
    r = client.post("/api/cricheroes/import", json={"url": URL, "match_id": match_id, "players": entries}, headers=admin_headers)
    assert r.status_code == 200, r.text
    result = r.json()
    assert (result["created_match"], result["players_linked"], result["points_saved"]) == (False, 7, 7)

    points = {row["player_id"]: row["points"] for row in client.get(f"/api/points/{match_id}", headers=admin_headers).json()}
    by_name = {p["player_name"]: p["id"] for p in players}
    assert points[by_name["Player 1"]] == 84
    board = client.get(f"/api/leaderboard/{match_id}", headers=user_headers).json()
    assert board[0]["points"] > 0

    # Links are remembered, so the next preview without a match id finds the same match and players.
    again = _preview(client, admin_headers)
    assert again["match_id"] == match_id
    assert {p["match_reason"] for p in again["players"]} == {"linked"}


def test_import_creates_match_and_players(client, admin_headers, fake_page):
    fake_page["html"] = page(team_a="Lions", team_b="Tigers")
    preview = _preview(client, admin_headers)
    assert preview["match_id"] is None and all(p["player_id"] is None for p in preview["players"])
    entries = [
        {"cricheroes_player_id": p["cricheroes_player_id"], "role": p["suggested_role"], "skip": p["cricheroes_player_id"] == 104}
        for p in preview["players"]
    ]
    r = client.post("/api/cricheroes/import", json={"url": URL, "players": entries}, headers=admin_headers)
    assert r.status_code == 200, r.text
    result = r.json()
    assert result["created_match"] and result["players_created"] == 6

    match = client.get(f"/api/matches/{result['match_id']}", headers=admin_headers).json()
    assert (match["team_a"], match["team_b"], match["status"]) == ("Lions", "Tigers", "closed")
    names = {p["player_name"] for p in client.get("/api/players", params={"match_id": match["id"]}, headers=admin_headers).json()}
    assert "Player 1" in names and "Player 4" not in names


def test_import_rejects_player_from_wrong_team(client, admin_headers, fake_page):
    match_id = client.get("/api/matches", headers=admin_headers).json()[0]["id"]
    preview = _preview(client, admin_headers, match_id=match_id)
    team_b_player = next(p["player_id"] for p in preview["players"] if p["side"] == "b")
    entries = [{"cricheroes_player_id": 101, "player_id": team_b_player}]
    r = client.post("/api/cricheroes/import", json={"url": URL, "match_id": match_id, "players": entries}, headers=admin_headers)
    assert r.status_code == 400


def test_upcoming_match_without_scorecard(client, admin_headers, fake_page):
    fake_page["html"] = page(status="upcoming", with_scorecard=False)
    preview = _preview(client, admin_headers)
    assert preview["has_scorecard"] is False and preview["players"] == []
    r = client.post("/api/cricheroes/import", json={"url": URL, "match_name": "Final"}, headers=admin_headers)
    assert r.status_code == 200, r.text
    match = client.get(f"/api/matches/{r.json()['match_id']}", headers=admin_headers).json()
    assert (match["match_name"], match["status"]) == ("Final", "open")
