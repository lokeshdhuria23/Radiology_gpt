import json
import urllib.request
import urllib.error
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class GroqModelAdapter:
    """
    Adapter for Groq Cloud API LLM inference (e.g. openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b).
    Provides ultra-fast, structured reasoning for clinical agents.
    """

    DEFAULT_MODELS = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
    ]

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or getattr(settings, "GROQ_MODEL", "openai/gpt-oss-120b")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    @property
    def is_available(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 10)

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        json_mode: bool = False,
    ) -> str:
        """Synchronously generate text or JSON via Groq API."""
        if not self.is_available:
            raise ValueError("Groq API key not configured")

        sys_msg = system_prompt or (
            "You are an expert clinical reasoning AI assistant for RadiologyGPT. "
            "You provide rigorous, evidence-based, medically precise diagnostic evaluations."
        )

        messages = [
            {"role": "system", "content": sys_msg},
            {"role": "user", "content": prompt},
        ]

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        candidate_models = [self.model] + [m for m in self.DEFAULT_MODELS if m != self.model]

        for model_cand in candidate_models:
            payload["model"] = model_cand
            try:
                data_bytes = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    self.base_url,
                    data=data_bytes,
                    headers={
                        "Authorization": f"Bearer {self.api_key.strip()}",
                        "Content-Type": "application/json",
                        "User-Agent": "RadiologyGPT/1.0",
                    },
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    resp_json = json.loads(resp.read().decode("utf-8"))
                    content = resp_json["choices"][0]["message"]["content"]
                    logger.info(f"Groq generation successful with model {model_cand}")
                    return content
            except urllib.error.HTTPError as e:
                err_text = e.read().decode("utf-8", errors="ignore")
                logger.warning(f"Groq API error on {model_cand} (HTTP {e.code}): {err_text}")
                if e.code == 404:
                    # Model not found, try next candidate
                    continue
                elif e.code in (401, 403):
                    raise RuntimeError(f"Groq authentication error: {err_text}")
                else:
                    continue
            except Exception as e:
                logger.warning(f"Groq call failed for {model_cand}: {e}")
                continue

        raise RuntimeError("All Groq model attempts failed")
