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
