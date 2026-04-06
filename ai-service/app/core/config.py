"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    # Suppress Pydantic v2 warnings for field names starting with 'model_'
    model_config = ConfigDict(
        env_prefix="AI_SERVICE_",   # maps AI_SERVICE_MODEL_PATH → model_path
        env_file=".env",
        extra="allow",
        protected_namespaces=("settings_",),
    )

    # AI-service specific
    # Env vars: AI_SERVICE_MODEL_PATH, AI_SERVICE_MODEL_VERSION
    model_path:    str = "/app/models"
    model_version: str = "v1"

    # Database — env vars: POSTGRES_DB, POSTGRES_USER, etc.
    postgres_db:       str = "recruitpro"
    postgres_user:     str = "recruitpro"
    postgres_password: str = "changeme"
    postgres_host:     str = "db"
    postgres_port:     int = 5432

    # Redis — env vars: REDIS_HOST, REDIS_PORT, REDIS_GRAPH_DB
    redis_host:     str = "redis"
    redis_port:     int = 6379
    redis_graph_db: int = 1   # DB 0 = recommendation cache, DB 1 = graph persistence


settings = Settings()
