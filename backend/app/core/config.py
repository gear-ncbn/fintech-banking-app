"""
Production-ready configuration management using Pydantic settings.
"""
import json
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with validation and type hints."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application Settings
    environment: str = Field(default="production", description="Environment name")
    api_host: str = Field(default="0.0.0.0", description="API host")
    api_port: int = Field(default=8000, description="API port")
    workers: int = Field(default=4, description="Number of workers")
    debug: bool = Field(default=False, description="Debug mode")

    # Security
    secret_key: str = Field(
        default="change-this-in-production",
        description="Secret key for security operations"
    )
    jwt_secret_key: str = Field(
        default="change-this-jwt-secret",
        description="JWT secret key"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    jwt_access_token_expire_minutes: int = Field(
        default=30,
        description="Access token expiration in minutes"
    )
    jwt_refresh_token_expire_days: int = Field(
        default=7,
        description="Refresh token expiration in days"
    )

    # CORS Settings
    # NoDecode keeps pydantic-settings from JSON-decoding the env value so the
    # validator below can accept either a JSON array or a comma-separated list.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins"
    )
    cors_allow_credentials: bool = Field(default=True)
    cors_allow_methods: Annotated[list[str], NoDecode] = Field(default=["*"])
    cors_allow_headers: Annotated[list[str], NoDecode] = Field(default=["*"])

    # Database
    database_url: str | None = Field(
        default="sqlite:///./bankflow.db",
        description="Database connection URL"
    )

    # Redis Cache
    redis_url: str | None = Field(
        default=None,
        description="Redis connection URL"
    )

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="json", description="Log format (json/text)")
    log_file: str | None = Field(default=None, description="Log file path")

    # Rate Limiting
    rate_limit_enabled: bool = Field(default=True)
    rate_limit_requests: int = Field(default=100)
    rate_limit_period: int = Field(default=60, description="Period in seconds")

    # Monitoring
    sentry_dsn: str | None = Field(default=None)
    prometheus_enabled: bool = Field(default=False)

    # External Services
    smtp_host: str | None = Field(default=None)
    smtp_port: int = Field(default=587)
    smtp_username: str | None = Field(default=None)
    smtp_password: str | None = Field(default=None)
    smtp_from_email: str = Field(default="noreply@bankflow.com")

    # Feature Flags
    use_mock_db: bool = Field(default=True)
    enable_swagger_ui: bool = Field(default=True)
    enable_redoc: bool = Field(default=False)

    # Performance
    connection_pool_size: int = Field(default=20)
    connection_max_overflow: int = Field(default=10)

    @field_validator(
        "cors_origins", "cors_allow_methods", "cors_allow_headers", mode="before"
    )
    @classmethod
    def _parse_str_list(cls, v: object) -> object:
        """Accept a JSON array or a comma-separated string for list settings."""
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            if s.startswith("["):
                return json.loads(s)
            return [item.strip() for item in s.split(",") if item.strip()]
        return v

    @field_validator("environment", mode="before")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = ["development", "staging", "production", "test"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of {allowed}")
        return v

    @field_validator("log_level", mode="before")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in allowed:
            raise ValueError(f"Log level must be one of {allowed}")
        return v_upper

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.environment == "development"

    @property
    def docs_enabled(self) -> bool:
        """Check if API documentation should be enabled."""
        # Disable docs in production unless explicitly enabled
        if self.is_production:
            return self.enable_swagger_ui or self.enable_redoc
        return True


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Export settings instance
settings = get_settings()
