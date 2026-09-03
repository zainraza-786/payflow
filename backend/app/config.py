"""
Application configuration.

Loads settings from environment variables (via .env in development).
No secrets are hardcoded here. Razorpay credentials are intentionally
NOT part of Phase 1 configuration.
"""

from decimal import Decimal
from pydantic_settings import BaseSettings, SettingsConfigDict



class Settings(BaseSettings):
    app_name: str = "Vasuli AI"
    environment: str = "development"
    database_url: str = "sqlite:///./vasuli.db"

    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None
    razorpay_webhook_secret: str | None = "test_webhook_secret"
    cors_origins: str = "*"

    high_value_threshold_inr: Decimal = Decimal("10000.00")
    quiet_hours_start: int = 22
    quiet_hours_end: int = 8
    quiet_hours_timezone: str = "Asia/Kolkata"
    max_recovery_attempts: int = 2




    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
