from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET = "bachpan-cricket-league-dev-secret-change-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    secret_key: str = DEV_SECRET
    algorithm: str = "HS256"
    # Logins last a day; set ACCESS_TOKEN_EXPIRE_MINUTES to change it.
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "sqlite:///./bachpan_cricket.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Admin account bootstrapped on startup when it does not exist yet.
    admin_mobile: str = "9999999999"
    admin_password: str | None = None
    admin_name: str = "League Admin"

    # Sample match and players, only useful for local development.
    seed_demo_data: bool = True

    # Login/register attempts allowed per client IP per window.
    auth_rate_limit: int = 10
    auth_rate_window_seconds: int = 60

    log_level: str = "INFO"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @property
    def sqlalchemy_url(self) -> str:
        # Heroku/Render style URLs use the scheme SQLAlchemy 2 no longer accepts.
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql://", 1)
        return self.database_url

    @model_validator(mode="after")
    def check_production_settings(self) -> "Settings":
        if self.is_production:
            if self.secret_key == DEV_SECRET or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be set to a random value of at least 32 characters in production")
            if self.admin_password is not None and len(self.admin_password) < 12:
                raise ValueError("ADMIN_PASSWORD must be at least 12 characters in production")
        return self


settings = Settings()
