"""
User profile router.
Returns profile data from AWS Cognito JWT claims.
No separate database record needed — name/email/picture live in the token.
"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.middleware.auth import CurrentUser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["User"])


class UserProfile(BaseModel):
    uid: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


@router.get("/profile", response_model=UserProfile)
async def get_profile(user: CurrentUser):
    """Return the authenticated user's profile from their Cognito JWT claims."""
    return UserProfile(
        uid=user.uid,
        email=user.email,
        display_name=user.name,
        avatar_url=user.picture,
    )
