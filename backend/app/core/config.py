# app/core/config.py
from pydantic import BaseSettings, Field, validator
from typing import Optional
import os

class Settings(BaseSettings):
    """
    Application settings with environment validation.
    Uses Pydantic BaseSettings to load from .env automatically.
    """

    # API Keys
    gemini_api_key: str = Field(..., env="GEMINI_API_KEY")
    openai_api_key: str = Field(..., env="OPENAI_API_KEY")

    # Optional config
    env: str = Field("development", env="APP_ENV")  # dev, staging, prod
    upload_dir: str = Field("uploads", env="UPLOAD_DIR")
    max_file_size_mb: int = Field(5, env="MAX_FILE_SIZE_MB")
    max_rows: int = Field(20000, env="MAX_ROWS")
    chunk_size: int = Field(500, env="CHUNK_SIZE")
    request_timeout_seconds: int = Field(30, env="REQUEST_TIMEOUT_SECONDS")

    @validator("gemini_api_key", "openai_api_key")
    def keys_must_not_be_empty(cls, v, field):
        if not v:
            raise ValueError(f"{field.name} is required and cannot be empty")
        return v

    @validator("max_file_size_mb", "max_rows", "chunk_size", "request_timeout_seconds")
    def positive_numbers(cls, v, field):
        if v <= 0:
            raise ValueError(f"{field.name} must be a positive number")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Instantiate singleton settings
settings = Settings()