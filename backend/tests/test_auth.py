from app.services.rate_limit import auth_limiter


def test_register_login_and_me(client):
    r = client.post("/api/auth/register", json={"name": "Asha", "mobile": " 9123456789 ", "password": "longpassword"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.post("/api/auth/login", json={"mobile": "9123456789", "password": "longpassword"})
    assert r.status_code == 200

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["mobile"] == "9123456789"
    assert r.json()["created_at"].endswith("+00:00")


def test_duplicate_mobile_rejected(client, user_headers):
    r = client.post("/api/auth/register", json={"name": "Other", "mobile": "9876543210", "password": "secret-pass"})
    assert r.status_code == 400


def test_invalid_mobile_rejected(client):
    r = client.post("/api/auth/register", json={"name": "Bad", "mobile": "12ab567890", "password": "secret-pass"})
    assert r.status_code == 422


def test_register_requires_exactly_10_digits(client):
    for mobile in ["912345678", "91234567890", "+919123456789"]:
        r = client.post("/api/auth/register", json={"name": "Bad", "mobile": mobile, "password": "secret-pass"})
        assert r.status_code == 422, mobile


def test_wrong_password(client):
    r = client.post("/api/auth/login", json={"mobile": "9999999999", "password": "nope"})
    assert r.status_code == 401


def test_bad_token(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


def test_login_rate_limited(client):
    auth_limiter.reset()
    codes = [
        client.post("/api/auth/login", json={"mobile": "9999999999", "password": "nope"}).status_code
        for _ in range(auth_limiter.limit + 1)
    ]
    assert codes[-1] == 429


def test_non_admin_blocked_from_admin_routes(client, user_headers):
    assert client.get("/api/admin/stats", headers=user_headers).status_code == 403


def test_health(client):
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/health").status_code == 200


def _change(client, headers, current, new):
    return client.post("/api/auth/change-password", json={"current_password": current, "new_password": new}, headers=headers)


def _admin_login(client, password):
    return client.post("/api/auth/login", json={"mobile": "9999999999", "password": password}).status_code


def test_admin_changes_own_password_and_it_survives_a_restart(client, admin_headers):
    from app.database import SessionLocal
    from app.seed import seed_database

    assert _change(client, admin_headers, "test-admin-password", "brand-new-admin-pass").status_code == 200
    assert _admin_login(client, "test-admin-password") == 401
    assert _admin_login(client, "brand-new-admin-pass") == 200
    # Render restarts the app often; the unchanged ADMIN_PASSWORD must not undo the change.
    with SessionLocal() as db:
        seed_database(db)
    assert _admin_login(client, "brand-new-admin-pass") == 200
    assert _admin_login(client, "test-admin-password") == 401


def test_changing_admin_password_env_still_resets_it(client, admin_headers, monkeypatch):
    from app.config import settings
    from app.database import SessionLocal
    from app.seed import seed_database

    _change(client, admin_headers, "test-admin-password", "forgotten-in-app-pass")
    monkeypatch.setattr(settings, "admin_password", "emergency-reset-pass")
    with SessionLocal() as db:
        seed_database(db)
    assert _admin_login(client, "emergency-reset-pass") == 200
    assert _admin_login(client, "forgotten-in-app-pass") == 401


def test_change_password_rules(client, admin_headers, user_headers):
    assert _change(client, admin_headers, "wrong-current", "brand-new-admin-pass").status_code == 400
    assert _change(client, admin_headers, "test-admin-password", "short-pass1").status_code == 400  # admins need 12+
    assert _change(client, admin_headers, "test-admin-password", "test-admin-password").status_code == 400
    assert _change(client, admin_headers, "test-admin-password", "tiny").status_code == 422
    assert client.post("/api/auth/change-password", json={"current_password": "x", "new_password": "long-enough-1"}).status_code == 401
    # Members can change theirs too, with the normal 8-character minimum.
    assert _change(client, user_headers, "secret-pass", "member-pass1").status_code == 200
