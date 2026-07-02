from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://sri:sri_secret@localhost:5432/sri_lab"

    # Auth
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_hours: int = 24
    refresh_token_expire_days: int = 7

    # File storage
    file_storage_backend: str = "local"  # "local" | "s3"
    file_storage_path: str = "/app/file_storage"

    # AWS / S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = ""
    aws_region: str = "ap-south-1"

    # Payments
    payment_webhook_secret: str = "change-me"

    # SMTP
    smtp_host: str = "localhost"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # SMS
    sms_provider: str = "msg91"
    sms_api_key: str = ""

    # Logging
    log_level: str = "INFO"

    # Business rules
    gst_rate: float = 0.18
    lab_timezone: str = "Asia/Kolkata"

    # Environment
    env_profile: str = "local"

    # CORS
    cors_origins: list[str] = ["http://localhost:4200", "http://localhost:3000"]

    # Admin seed (auto-created on startup)
    admin_phone: str = "9999999999"
    admin_email: str = "admin@sri.local"
    admin_name: str = "Admin"
    admin_password: str = "Admin@123"

    @property
    def CORS_ORIGINS(self) -> list[str]:
        return self.cors_origins


settings = Settings()
