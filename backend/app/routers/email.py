"""
Email router.
Sends transactional emails via Resend.
Replaces the Vercel Serverless Function at api/send-welcome-email.ts.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/email", tags=["Email"])


# ── Email Templates ──────────────────────────────────────

LOGO_BASE64 = (
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHJ4PSIxMiIgZmlsbD0icmdiYSg3OSwgMjA5LCAxOTksIDAuMikiIHN0cm9rZT0icmdiYSg3OSwgMjA5LCAxOTksIDAuMykiIHN0cm9rZS13aWR0aD0iMSIvPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEyLCAxMikgc2NhbGUoMC43NSkiPgogICAgPHBhdGggZD0iTTEyIDJhMyAzIDAgMCAwLTMgM3Y3YTMgMyAwIDAgMCA2IDBWNWEzIDMgMCAwIDAtMy0zWiIgc3Ryb2tlPSIjNEZEMUM3IiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJNMTkgMTB2MmE3IDcgMCAwIDEtMTQgMHYtMiIgc3Ryb2tlPSIjNEZEMUM3IiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+CiAgICA8bGluZSB4MT0iMTIiIHkxPSIxOSIgeDI9IjEyIiB5Mj0iMjIiIHN0cm9rZT0iIzRGRDFDNyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwvZz4KPC9zdmc+"
)


def _welcome_email_html(user_name: str, dashboard_url: str, app_name: str) -> str:
    year = datetime.utcnow().year
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to {app_name}</title>
</head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0A0E1A;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0A0E1A;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:linear-gradient(135deg,rgba(15,20,31,0.95) 0%,rgba(10,14,26,0.9) 100%);border:1px solid rgba(42,49,66,0.5);border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#0A0E1A;padding:32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:40px;height:40px;border-radius:12px;background-color:rgba(79,209,199,0.2);border:1px solid rgba(79,209,199,0.3);display:inline-block;">
                      <img src="{LOGO_BASE64}" alt="{app_name}" width="40" height="40" style="display:block;" />
                    </div>
                  </td>
                  <td style="vertical-align:middle;">
                    <h1 style="color:#F7F9FC;font-size:18px;font-weight:600;margin:0;">{app_name}</h1>
                    <p style="color:#7A8A9F;font-size:12px;margin:2px 0 0 0;">AI-Powered Mock Interviews</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr><td align="center" style="padding-bottom:20px;">
                  <h2 style="color:#F7F9FC;font-size:24px;font-weight:600;margin:0;">Welcome, {user_name}!</h2>
                </td></tr>
                <tr><td align="center" style="padding-bottom:24px;">
                  <p style="color:#7A8A9F;font-size:15px;margin:0;line-height:1.6;">Thank you for joining {app_name}! We're excited to help you prepare for your next interview.</p>
                </td></tr>

                <!-- Features -->
                <tr><td style="padding-bottom:24px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:rgba(15,20,31,0.8);border:1px solid rgba(42,49,66,0.5);border-radius:10px;padding:20px;">
                    <tr><td><h3 style="color:#F7F9FC;font-size:18px;font-weight:600;margin:0 0 16px 0;">What you can do:</h3></td></tr>
                    <tr><td style="color:#7A8A9F;font-size:14px;line-height:1.7;padding:4px 0;"><span style="color:#4FD1C7;margin-right:8px;">•</span> Practice adaptive mock interviews with real-time AI feedback</td></tr>
                    <tr><td style="color:#7A8A9F;font-size:14px;line-height:1.7;padding:4px 0;"><span style="color:#4FD1C7;margin-right:8px;">•</span> Upload your resume for personalized, job-specific questions</td></tr>
                    <tr><td style="color:#7A8A9F;font-size:14px;line-height:1.7;padding:4px 0;"><span style="color:#4FD1C7;margin-right:8px;">•</span> Track your progress and score trends over time</td></tr>
                    <tr><td style="color:#7A8A9F;font-size:14px;line-height:1.7;padding:4px 0;"><span style="color:#4FD1C7;margin-right:8px;">•</span> Get a detailed readiness assessment after every session</td></tr>
                  </table>
                </td></tr>

                <!-- CTA -->
                <tr><td align="center" style="padding-bottom:24px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center" style="background:linear-gradient(135deg,#4FD1C7 0%,#38A169 100%);border-radius:8px;">
                        <a href="{dashboard_url}" style="display:inline-block;color:#0A0E1A;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;">Get Started</a>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(15,20,31,0.5);padding:20px 24px;text-align:center;border-top:1px solid rgba(42,49,66,0.5);">
              <p style="color:#7A8A9F;font-size:11px;margin:0;">© {year} {app_name}. All rights reserved.</p>
              <p style="color:#7A8A9F;font-size:11px;margin:4px 0 0 0;">You received this because you created an account with {app_name}.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ── Models ────────────────────────────────────────────────


class WelcomeEmailRequest(BaseModel):
    email: EmailStr
    user_name: str
    dashboard_url: str


class WelcomeEmailResponse(BaseModel):
    success: bool
    message: str
    message_id: Optional[str] = None


# ── Routes ────────────────────────────────────────────────


@router.post("/welcome", response_model=WelcomeEmailResponse)
async def send_welcome_email(body: WelcomeEmailRequest):
    """
    Send a welcome email to a newly registered user.
    Does not require authentication — called immediately after sign-up
    before the Firebase token may be fully available client-side.
    """
    settings = get_settings()

    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not configured — skipping welcome email")
        return WelcomeEmailResponse(success=False, message="Email service not configured")

    try:
        import resend
        resend.api_key = settings.resend_api_key

        app_name = settings.app_name
        html = _welcome_email_html(body.user_name, body.dashboard_url, app_name)

        response = resend.Emails.send({
            "from": settings.email_from,
            "to": [body.email],
            "subject": f"Welcome to {app_name}!",
            "html": html,
        })

        return WelcomeEmailResponse(
            success=True,
            message="Welcome email sent",
            message_id=response.get("id"),
        )
    except Exception as exc:
        logger.error(f"Failed to send welcome email to {body.email}: {exc}")
        raise HTTPException(500, f"Failed to send email: {exc}")
