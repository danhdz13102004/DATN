"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # AI-service specific (read from AI_SERVICE_MODEL_PATH, AI_SERVICE_MODEL_VERSION)
    model_path: str = "/app/models"
    model_version: str = "v1"

    # Database (read from POSTGRES_DB, POSTGRES_USER, etc.)
    postgres_db: str = "recruitpro"
    postgres_user: str = "recruitpro"
    postgres_password: str = "changeme"
    postgres_host: str = "db"
    postgres_port: int = 5432

    # Redis (read from REDIS_HOST, REDIS_PORT)
    redis_host: str = "redis"
    redis_port: int = 6379

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

