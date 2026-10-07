import hashlib
import hmac
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models.app_setting import AppSetting
from app.models.match import Match
from app.models.player import Player
from app.models.user import User
from app.services.auth import hash_password, verify_password
from app.services.teams import unify_team_names

logger = logging.getLogger(__name__)

TEAM_A = "Team A"
TEAM_B = "Team B"

TEAM_A_PLAYERS = [
    ("Player 1", "WK"),
    ("Player 2", "BAT"),
    ("Player 3", "BAT"),
    ("Player 4", "BAT"),
    ("Player 5", "AR"),
    ("Player 6", "AR"),
    ("Player 7", "BOWL"),
    ("Player 8", "BOWL"),
    ("Player 9", "BOWL"),
    ("Player 10", "BAT"),
    ("Player 11", "BOWL"),
]

TEAM_B_PLAYERS = [
    ("Player 12", "WK"),
    ("Player 13", "BAT"),
    ("Player 14", "BAT"),
    ("Player 15", "BAT"),
    ("Player 16", "AR"),
    ("Player 17", "AR"),
    ("Player 18", "BOWL"),
    ("Player 19", "BOWL"),
    ("Player 20", "BOWL"),
    ("Player 21", "BAT"),
    ("Player 22", "BOWL"),
]


def seed_database(db: Session) -> None:
    ensure_admin(db)
    if settings.seed_demo_data:
        seed_demo_data(db)
    db.flush()
    unify_team_names(db)
    db.commit()


def ensure_admin(db: Session) -> None:
    # The database (e.g. Neon) outlives deploys. ADMIN_PASSWORD is applied when it is new or has been changed in the
    # host's settings, so a password the admin later changes in the app survives restarts, while editing the env var
    # still works as a reset.
    configured = db.query(User).filter(User.mobile == settings.admin_mobile).first()
    if configured and settings.admin_password is not None:
        configured.role = "admin"
        applied = db.get(AppSetting, ADMIN_PASSWORD_KEY)
        fingerprint = _fingerprint(settings.admin_password)
        if applied is None or not hmac.compare_digest(applied.value, fingerprint):
            if not verify_password(settings.admin_password, configured.password_hash):
                configured.password_hash = hash_password(settings.admin_password)
                logger.info("Updated admin %s from ADMIN_PASSWORD", settings.admin_mobile)
            if applied is None:
                db.add(AppSetting(key=ADMIN_PASSWORD_KEY, value=fingerprint))
            else:
                applied.value = fingerprint
        return
    if configured or (settings.admin_password is None and db.query(User).filter(User.role == "admin").first()):
        return
    password = settings.admin_password
    if password is None:
        if settings.is_production:
            logger.warning("No admin user exists and ADMIN_PASSWORD is not set; skipping admin bootstrap")
            return
        password = "admin123"
        logger.warning("Creating development admin %s with the default password", settings.admin_mobile)
    db.add(
        User(
            name=settings.admin_name,
            mobile=settings.admin_mobile,
            password_hash=hash_password(password),
            role="admin",
        )
    )
    if settings.admin_password is not None:
        db.merge(AppSetting(key=ADMIN_PASSWORD_KEY, value=_fingerprint(settings.admin_password)))


ADMIN_PASSWORD_KEY = "admin_password_applied"


def _fingerprint(password: str) -> str:
    """Keyed hash of ADMIN_PASSWORD, so we can tell when it changes without storing it."""
    return hmac.new(settings.secret_key.encode(), password.encode(), hashlib.sha256).hexdigest()


def seed_demo_data(db: Session) -> None:
    if db.query(Match).count() == 0:
        db.add(
            Match(
                match_name="Sunday Local Derby",
                team_a=TEAM_A,
                team_b=TEAM_B,
                match_date=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=2),
                status="open",
            )
        )

    if db.query(Player).count() == 0:
        for name, role in TEAM_A_PLAYERS:
            db.add(Player(player_name=name, team_name=TEAM_A, role=role, active=True))
        for name, role in TEAM_B_PLAYERS:
            db.add(Player(player_name=name, team_name=TEAM_B, role=role, active=True))
