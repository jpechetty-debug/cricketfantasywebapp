from tests.conftest import alternate_teams


def test_admin_lists_and_deletes_a_member_with_their_squad(client, admin_headers, user_headers):
    match_id = client.get("/api/matches", headers=admin_headers).json()[0]["id"]
    ids = [p["id"] for p in alternate_teams(client.get("/api/players", params={"match_id": match_id}, headers=admin_headers).json())]
    body = {"match_id": match_id, "selected_players": ids[:7], "captain_id": ids[0], "vice_captain_id": ids[1]}
    assert client.post("/api/teams", json=body, headers=user_headers).status_code == 200

    [member] = client.get("/api/admin/users", headers=admin_headers).json()
    assert (member["name"], member["mobile"], member["squads"]) == ("Ravi", "9876543210", 1)

    r = client.delete(f"/api/admin/users/{member['id']}", headers=admin_headers)
    assert r.status_code == 200 and r.json()["squads_removed"] == 1
    assert client.get("/api/admin/users", headers=admin_headers).json() == []
    assert client.get(f"/api/leaderboard/{match_id}", headers=admin_headers).json() == []
    # Their old login stops working.
    assert client.get("/api/auth/me", headers=user_headers).status_code == 401


def test_admin_account_cannot_be_deleted(client, admin_headers):
    admin_id = client.get("/api/auth/me", headers=admin_headers).json()["id"]
    assert client.delete(f"/api/admin/users/{admin_id}", headers=admin_headers).status_code == 400
    assert client.delete("/api/admin/users/99999", headers=admin_headers).status_code == 404


def test_member_management_is_admin_only(client, user_headers):
    assert client.get("/api/admin/users", headers=user_headers).status_code == 403
    assert client.delete("/api/admin/users/1", headers=user_headers).status_code == 403


def test_dashboard_shows_who_entered_a_squad(client, admin_headers, user_headers):
    match_id = client.get("/api/matches", headers=admin_headers).json()[0]["id"]
    ids = [p["id"] for p in alternate_teams(client.get("/api/players", params={"match_id": match_id}, headers=admin_headers).json())]
    client.post("/api/auth/register", json={"name": "Zara", "mobile": "9000000099", "password": "secret-pass"})
    body = {"match_id": match_id, "selected_players": ids[:7], "captain_id": ids[0], "vice_captain_id": ids[1]}
    assert client.post("/api/teams", json=body, headers=user_headers).status_code == 200

    [row] = client.get("/api/admin/entries", headers=admin_headers).json()
    assert row["match_id"] == match_id and row["members"] == 2
    assert [m["name"] for m in row["entered"]] == ["Ravi"] and row["entered"][0]["entered_at"]
    assert [m["name"] for m in row["missing"]] == ["Zara"]
    # Completed matches drop off the list; it's members only.
    client.patch(f"/api/matches/{match_id}/status", json={"status": "closed"}, headers=admin_headers)
    assert client.get("/api/admin/entries", headers=admin_headers).json() == []
    assert client.get("/api/admin/entries", headers=user_headers).status_code == 403
