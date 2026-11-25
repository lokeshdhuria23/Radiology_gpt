from typing import Optional
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class SupabaseStorageService:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                from supabase import create_client
                self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY)
            except Exception as e:
                logger.error(f"Failed to create Supabase client: {e}")
                raise
        return self._client

    def upload_file(self, bucket: str, path: str, file_content: bytes, content_type: str = "application/octet-stream") -> str:
        try:
            client = self._get_client()
            client.storage.from_(bucket).upload(path, file_content, {"content-type": content_type})
            return path
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            raise

    def download_file(self, bucket: str, path: str) -> bytes:
        try:
            client = self._get_client()
            return client.storage.from_(bucket).download(path)
        except Exception as e:
            logger.error(f"Download failed: {e}")
            raise

    def get_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        try:
            client = self._get_client()
            result = client.storage.from_(bucket).create_signed_url(path, expires_in)
            return result.get("signedURL", result.get("signedUrl", ""))
        except Exception as e:
            logger.error(f"Signed URL failed: {e}")
            raise

    def delete_file(self, bucket: str, path: str) -> bool:
        try:
            client = self._get_client()
            client.storage.from_(bucket).remove([path])
            return True
        except Exception as e:
            logger.error(f"Delete failed: {e}")
            return False
