from app.config import Settings


def test_config_defaults():
    settings = Settings()
    assert settings.app_name == "Vasuli AI"
    assert settings.environment == "development"
    assert settings.database_url.startswith("sqlite")
