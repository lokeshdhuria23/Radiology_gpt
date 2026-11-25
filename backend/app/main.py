import sys, os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CDSS Backend starting...")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info(f"Demo Mode: {settings.DEMO_MODE}")
    logger.info(f"Device: {settings.DEVICE}")
    logger.info(f"OCR Enabled: {settings.OCR_ENABLED}")
    logger.info(f"Vector Search: {settings.VECTOR_SEARCH_ENABLED}")
    # Check model availability
    if settings.CHECKPOINT_DIR:
        cp = Path(settings.CHECKPOINT_DIR)
        if cp.exists():
            models = list(cp.glob("*"))
            logger.info(f"Checkpoints found: {len(models)} items in {cp}")
        else:
            logger.warning(f"Checkpoint dir not found: {cp}")
    if settings.DEMO_MODE:
        logger.warning("⚠️ Running in DEMO MODE - AI responses are mock/synthetic")
    yield
    logger.info("CDSS Backend shutting down")

app = FastAPI(
    title="CDSS - Clinical Decision Support System",
    description="Multi-agent AI Clinical Decision Support System API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        f"http://localhost:{settings.FRONTEND_PORT}",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "demo_mode": settings.DEMO_MODE,
        "environment": settings.APP_ENV,
    }

# Import and include routers
from app.api.routes import api_router
app.include_router(api_router, prefix="/api")
