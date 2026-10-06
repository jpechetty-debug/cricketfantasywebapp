"""Delete every non-admin user and their fantasy squads (e.g. to clear test sign-ups before launch).

Matches, players and points are kept. Admin accounts are kept.

    # dry run: shows what would be removed
    DATABASE_URL=postgresql://... python scripts/reset_users.py
    # actually delete
    DATABASE_URL=postgresql://... python scripts/reset_users.py --yes
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models.fantasy_team import FantasyTeam  # noqa: E402
from app.models.user import User  # noqa: E402


def main() -> None:
    apply = "--yes" in sys.argv[1:]
    target = settings.sqlalchemy_url.split("@")[-1].split("?")[0]
    print(f"Database: {target}")

    with SessionLocal() as db:
        user_ids = [uid for (uid,) in db.query(User.id).filter(User.role != "admin")]
        teams = db.query(FantasyTeam).filter(FantasyTeam.user_id.in_(user_ids))
        print(f"Users to delete: {len(user_ids)}; their fantasy squads: {teams.count()}")
        print(f"Admins kept: {db.query(User).filter(User.role == 'admin').count()}")
        if not apply:
            print("Dry run only. Re-run with --yes to delete.")
            return
        teams.delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
        db.commit()
        print("Done.")


if __name__ == "__main__":
    main()
