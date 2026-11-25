import os
from pathlib import Path
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def auto_detect_device() -> str:
    """
    Auto-detect available acceleration device.
    Tries torch.cuda.is_available, checks mps on macOS, and falls back to cpu.
    """
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    except Exception:
        pass
    return "cpu"


class Settings(BaseSettings):
    # Supabase Configuration
    SUPABASE_URL: str = "https://ohldosoabcpixgizbzxa.supabase.co"
    SUPABASE_ANON_KEY: str = "sb_publishable_V8OlybzfoJlME0e7Jrufjg_XZn_JDYF"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_DB_URL: str = "postgresql+asyncpg://postgres:your-password@db.your-project.supabase.co:5432/postgres"
    SUPABASE_STORAGE_BUCKET: str = "medical-files"

    # Server Configuration
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173
    APP_ENV: str = "development"

    # Security Configuration
    SECRET_KEY: str = "your-secret-key-change-this"
    JWT_SECRET: str = "your-supabase-jwt-secret"

    # Model & Storage Paths
    CHECKPOINT_DIR: Path = Path("./checkpoints")
    TEXT_MODEL_PATH: Optional[Path] = None
    VISION_MODEL_PATH: Optional[Path] = None
    EMBEDDING_MODEL_PATH: Optional[Path] = None

    # AI Feature Flags & Settings
    OCR_ENABLED: bool = True
    VECTOR_SEARCH_ENABLED: bool = True
    DEVICE: str = "auto"
    DEMO_MODE: bool = True
    KNOWLEDGE_BASE_DIR: Path = Path("./knowledge_base")
    EMBEDDING_DIMENSION: int = 384

    # Groq LLM Configuration
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # Application & Logging Settings
    LOG_LEVEL: str = "INFO"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_FILE_TYPES: str = "pdf,png,jpg,jpeg,tiff,dcm,txt,doc,docx"

    model_config = SettingsConfigDict(
        env_file=[
            Path(__file__).resolve().parent.parent.parent / ".env",
            ".env",
        ],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("DEVICE", mode="after")
    @classmethod
    def resolve_device_setting(cls, v: str) -> str:
        """Resolve device automatically if set to 'auto'."""
        if v.lower() == "auto":
            return auto_detect_device()
        return v

    @field_validator("TEXT_MODEL_PATH", "VISION_MODEL_PATH", "EMBEDDING_MODEL_PATH", mode="before")
    @classmethod
    def parse_optional_path(cls, v: Union[str, Path, None]) -> Optional[Path]:
        if v is None or v == "":
            return None
        p = Path(v)
        if not p.is_absolute() and not p.exists():
            project_root = Path(__file__).resolve().parents[3]
            if (project_root / p).exists():
                return project_root / p
        return p

    @field_validator("CHECKPOINT_DIR", "KNOWLEDGE_BASE_DIR", mode="before")
    @classmethod
    def parse_path(cls, v: Union[str, Path, None]) -> Path:
        if isinstance(v, Path):
            p = v
        elif not v:
            p = Path(".")
        else:
            p = Path(v)
        if not p.is_absolute() and not p.exists():
            project_root = Path(__file__).resolve().parents[3]
            if (project_root / p).exists():
                return project_root / p
        return p

    @property
    def is_model_available(self) -> bool:
        """
        Check if any configured checkpoint paths or checkpoint directory models exist.
        """
        configured_paths = [
            self.TEXT_MODEL_PATH,
            self.VISION_MODEL_PATH,
            self.EMBEDDING_MODEL_PATH,
        ]
        valid_paths = [p for p in configured_paths if p is not None and str(p).strip() != ""]
        if valid_paths:
            return any(p.exists() for p in valid_paths)

        if self.CHECKPOINT_DIR and self.CHECKPOINT_DIR.exists():
            try:
                return any(self.CHECKPOINT_DIR.iterdir())
            except OSError:
                return False

        return False

    @property
    def allowed_file_types_list(self) -> List[str]:
        """Return allowed file types as a clean list of lowercased file extensions."""
        if not self.ALLOWED_FILE_TYPES:
            return []
        return [ext.strip().lower().lstrip(".") for ext in self.ALLOWED_FILE_TYPES.split(",") if ext.strip()]


# Create singleton instance
settings = Settings()
