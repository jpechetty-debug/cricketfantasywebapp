import os
import tempfile

_tmp_dir = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_tmp_dir, 'test.db')}"
os.environ["ENVIRONMENT"] = "test"
os.environ["ADMIN_PASSWORD"] = "test-admin-password"
os.environ["SEED_DEMO_DATA"] = "true"
os.environ["FRONTEND_DIST"] = os.path.join(_tmp_dir, "no-frontend")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed_database  # noqa: E402
from app.services.rate_limit import auth_limiter  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
    auth_limiter.reset()
    with TestClient(app) as c:
        yield c


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_headers(client):
    r = client.post("/api/auth/login", json={"mobile": "9999999999", "password": "test-admin-password"})
    assert r.status_code == 200, r.text
    return auth_header(r.json()["access_token"])


@pytest.fixture()
def user_headers(client):
    r = client.post("/api/auth/register", json={"name": "Ravi", "mobile": "9876543210", "password": "secret-pass"})
    assert r.status_code == 200, r.text
    return auth_header(r.json()["access_token"])


def alternate_teams(players: list[dict]) -> list[dict]:
    """Interleave the two sides (A, B, A, B, ...) so 7 in a row from the start stay within the 4-per-team limit."""
    by_team: dict[str, list[dict]] = {}
    for p in players:
        by_team.setdefault(p["team_name"], []).append(p)
    sides = list(by_team.values())
    out: list[dict] = []
    if not sides:
        return out
    for i in range(max(len(s) for s in sides)):
        out.extend(s[i] for s in sides if i < len(s))
    return out
