from tests.conftest import auth_header


def _register(client, name, mobile):
    r = client.post("/api/auth/register", json={"name": name, "mobile": mobile, "password": "secret-pass"})
    assert r.status_code == 200, r.text
    return auth_header(r.json()["access_token"])


def test_admin_sees_top_three_with_mobiles_once_match_is_closed(client, admin_headers):
    match_id = client.get("/api/matches", headers=admin_headers).json()[0]["id"]
    players = client.get("/api/players", params={"match_id": match_id}, headers=admin_headers).json()
    ids = [p["id"] for p in players]

    # Four squads: captains differ so the scores differ; Dev and Esha tie for second.
    squads = {
        "Asha": ("9000000001", ids[:7], ids[0]),
        "Dev": ("9000000002", ids[1:8], ids[1]),
        "Esha": ("9000000003", ids[1:8], ids[1]),
        "Ravi": ("9000000004", ids[2:9], ids[8]),
    }
    for name, (mobile, selected, captain) in squads.items():
        headers = _register(client, name, mobile)
        vice = next(i for i in selected if i != captain)
        body = {"match_id": match_id, "selected_players": selected, "captain_id": captain, "vice_captain_id": vice}
        assert client.post("/api/teams", json=body, headers=headers).status_code == 200

    points = {ids[0]: 50, ids[1]: 30}
    entries = [{"player_id": pid, "points": points.get(pid, 1)} for pid in ids]
    assert client.post("/api/points", json={"match_id": match_id, "entries": entries}, headers=admin_headers).status_code == 200

    # Results are only published for closed matches.
    assert client.get("/api/admin/winners", headers=admin_headers).json() == []
    client.patch(f"/api/matches/{match_id}/status", json={"status": "closed"}, headers=admin_headers)

    [result] = client.get("/api/admin/winners", headers=admin_headers).json()
    assert result["match_id"] == match_id and result["squads"] == 4
    podium = [(w["rank"], w["name"], w["mobile"]) for w in result["winners"]]
    assert podium[0] == (1, "Asha", "9000000001")
    assert sorted(podium[1:]) == [(2, "Dev", "9000000002"), (2, "Esha", "9000000003")]
    assert "Ravi" not in {w["name"] for w in result["winners"]}


def test_winners_are_admin_only(client, user_headers):
    assert client.get("/api/admin/winners", headers=user_headers).status_code == 403
