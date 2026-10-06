"""
AWS Cognito Auth middleware for FastAPI.
Verifies Cognito ID or Access tokens from the Authorization header.
"""

import logging
import time
from typing import Annotated, Optional

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt

from app.config import get_settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

_jwks_cache = None
_jwks_cache_timestamp = 0
JWKS_CACHE_TTL = 3600  # 1 hour cache duration


class AuthUser:
    """Represents an authenticated user extracted from Cognito token."""

    def __init__(self, uid: str, email: Optional[str], name: Optional[str], picture: Optional[str] = None):
        self.uid = uid
        self.email = email
        self.name = name
        self.picture = picture

    def __repr__(self) -> str:
        return f"AuthUser(uid={self.uid!r}, email={self.email!r})"


async def get_jwks(user_pool_id: str, region: str) -> dict:
    """Fetch and cache Cognito JWKS keys."""
    global _jwks_cache, _jwks_cache_timestamp
    now = time.time()
    if _jwks_cache is None or now - _jwks_cache_timestamp > JWKS_CACHE_TTL:
        url = f"https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
        async with httpx.AsyncClient() as client:
            res = await client.get(url)
            res.raise_for_status()
            _jwks_cache = res.json()
            _jwks_cache_timestamp = now
            logger.info("Successfully fetched and cached Cognito JWKS")
    return _jwks_cache


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthUser:
    """
    FastAPI dependency that extracts and validates AWS Cognito token.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    settings = get_settings()

    # Local Development Bypass/Mock support
    if settings.environment == "development" and token == "mock-user-token":
        return AuthUser(
            uid="mock-user-uid",
            email="mock@example.com",
            name="Mock User",
        )

    if not settings.aws_cognito_user_pool_id:
        logger.error("AWS Cognito User Pool ID is not configured in settings.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service is misconfigured",
        )

    try:
        # 1. Fetch JWKS keys
        jwks = await get_jwks(settings.aws_cognito_user_pool_id, settings.aws_region)

        # 2. Get key ID (kid) from token header
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token header is missing 'kid'",
            )

        # 3. Find matching key in JWKS
        key_data = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Matching public key not found in JWKS",
            )

        # 4. Verify signature and claims
        iss = f"https://cognito-idp.{settings.aws_region}.amazonaws.com/{settings.aws_cognito_user_pool_id}"
        
        # Decode & Verify token automatically
        decoded = jwt.decode(
            token,
            key_data,
            algorithms=["RS256"],
            audience=settings.aws_cognito_client_id or None,
            issuer=iss,
            options={"verify_aud": True if settings.aws_cognito_client_id else False}
        )

        # 5. Build user object
        uid = decoded.get("sub")
        email = decoded.get("email")
        name = decoded.get("cognito:username") or decoded.get("name") or (email.split("@")[0] if email else "User")

        return AuthUser(
            uid=uid,
            email=email,
            name=name,
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.JWTError as jwt_err:
        logger.warning(f"Cognito token validation failed: {jwt_err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        logger.error(f"Auth verification error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error",
        )


# Type alias for dependency injection
CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
