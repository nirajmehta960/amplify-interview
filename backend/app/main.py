"""
Amplify Interview API — FastAPI application entry point.
"""


import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.middleware.rate_limit import limiter
from app.routers import resume, interview, feedback, analytics, questions, user, email, speech

# ── Logging ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    settings = get_settings()
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"GCP Project: {settings.gcp_project_id or '(not set)'}")

    # Initialize Firestore client on startup
    from app.db.firestore import get_firestore_client
    try:
        get_firestore_client()
        logger.info("Firestore client initialized")
    except Exception as e:
        logger.warning(f"Firestore initialization deferred: {e}")

    yield

    logger.info("Shutting down")


# ── App Instance ─────────────────────────────────────────

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI-powered interview preparation platform. "
        "Upload your resume and target job description to receive "
        "personalized, adaptive mock interviews with real-time feedback."
    ),
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Global Error Handler ─────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all error handler for unhandled exceptions."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )


# ── Routers ──────────────────────────────────────────────

app.include_router(resume.router)
app.include_router(interview.router)
app.include_router(feedback.router)
app.include_router(analytics.router)
app.include_router(questions.router)
app.include_router(user.router)
app.include_router(email.router)
app.include_router(speech.router)


# ── Health Check ─────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for Cloud Run."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
    }


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint — API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs" if settings.debug else "Disabled in production",
        "endpoints": {
            "health": "/health",
            "resume_upload": "POST /api/resume/upload",
            "job_description": "POST /api/resume/jd",
            "match_analysis": "POST /api/resume/match",
            "create_session": "POST /api/interview/session",
            "send_message": "POST /api/interview/session/{id}/message",
            "get_feedback": "GET /api/feedback/session/{id}",
            "analytics": "GET /api/analytics/overview",
            "user_profile": "GET /api/user/profile",
            "questions": "GET /api/questions",
            "welcome_email": "POST /api/email/welcome",
            "transcribe": "POST /api/speech/transcribe",
        },
    }
