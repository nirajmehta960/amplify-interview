// Vercel Serverless Function to send welcome emails via Resend
// This avoids CORS issues by calling Resend API from server-side

import { Resend } from "resend";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM;
const APP_NAME = process.env.APP_NAME;

// Welcome email template - matches the new dark theme UI
// Color conversions from HSL to hex:
// Primary: hsl(174 72% 56%) = #4FD1C7 (teal/cyan)
// Accent: hsl(160 60% 45%) = #38A169 (green-teal)
// Background: hsl(222 47% 6%) = #0A0E1A (very dark blue)
// Card: hsl(222 47% 8%) = #0F141F (slightly lighter dark)
// Foreground: hsl(210 40% 98%) = #F7F9FC (almost white)
// Border: hsl(222 30% 18%) = #2A3142 (dark gray)
// Muted foreground: hsl(215 20% 55%) = #7A8A9F (gray)

const createWelcomeEmailHTML = (userName: string, dashboardUrl: string) => {
  // Base64-encoded SVG logo for email compatibility
  // Many email clients don't support external SVG images or block them
  // Using inline base64-encoded SVG ensures maximum compatibility
  const logoBase64 =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB4PSI1IiB5PSI1IiB3aWR0aD0iMzAiIGhlaWdodD0iMzAiIHJ4PSIxMiIgZmlsbD0icmdiYSg3OSwgMjA5LCAxOTksIDAuMikiIHN0cm9rZT0icmdiYSg3OSwgMjA5LCAxOTksIDAuMykiIHN0cm9rZS13aWR0aD0iMSIvPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEyLCAxMikgc2NhbGUoMC43NSkiPgogICAgPHBhdGggZD0iTTEyIDJhMyAzIDAgMCAwLTMgM3Y3YTMgMyAwIDAgMCA2IDBWNWEzIDMgMCAwIDAtMy0zWiIgc3Ryb2tlPSIjNEZEMUM3IiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJNMTkgMTB2MmE3IDcgMCAwIDEtMTQgMHYtMiIgc3Ryb2tlPSIjNEZEMUM3IiBzdHJva2Utd2lkdGg9IjIuNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+CiAgICA8bGluZSB4MT0iMTIiIHkxPSIxOSIgeDI9IjEyIiB5Mj0iMjIiIHN0cm9rZT0iIzRGRDFDNyIgc3Ryb2tlLXdpZHRoPSIyLjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwvZz4KPC9zdmc+";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to ${APP_NAME}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0A0E1A; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0A0E1A;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(15, 20, 31, 0.95) 0%, rgba(10, 14, 26, 0.9) 100%); border: 1px solid rgba(42, 49, 66, 0.5); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(79, 209, 199, 0.15);">
          
          <!-- Header matching website navbar -->
          <tr>
            <td style="background-color: #0A0E1A; padding: 32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <!-- Logo image container matching header: w-10 h-10 rounded-xl bg-primary/20 border-primary/30 -->
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <div style="width: 40px; height: 40px; border-radius: 12px; background-color: rgba(79, 209, 199, 0.2); border: 1px solid rgba(79, 209, 199, 0.3); display: inline-block; vertical-align: middle; overflow: hidden; position: relative;">
                            <!-- Logo image - using base64-encoded SVG for email client compatibility -->
                            <img src="${logoBase64}" alt="${APP_NAME} Logo" width="40" height="40" style="display: block; width: 40px; height: 40px; object-fit: contain;" />
                          </div>
                        </td>
                        <!-- Text content -->
                        <td style="vertical-align: middle;">
                          <h1 style="color: #F7F9FC; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 600; margin: 0; line-height: 1.2;">${APP_NAME}</h1>
                          <p style="color: #7A8A9F; font-size: 12px; margin: 2px 0 0 0; line-height: 1.4;">AI-Powered Mock Interviews</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <h2 style="color: #F7F9FC; font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.01em; line-height: 1.3;">Welcome, ${userName}!</h2>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <p style="color: #7A8A9F; font-size: 15px; margin: 0; line-height: 1.6; max-width: 520px;">Thank you for joining ${APP_NAME}! We're excited to help you prepare for your next interview with AI-powered coaching and feedback.</p>
                  </td>
                </tr>
                
                <!-- Feature card -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, rgba(15, 20, 31, 0.8) 0%, rgba(10, 14, 26, 0.6) 100%); border: 1px solid rgba(42, 49, 66, 0.5); border-radius: 10px; padding: 20px;">
                      <tr>
                        <td>
                          <h3 style="color: #F7F9FC; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; line-height: 1.3;">What you can do:</h3>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="color: #7A8A9F; font-size: 14px; line-height: 1.7; padding: 4px 0;">
                                <span style="color: #4FD1C7; margin-right: 8px;">•</span> Practice mock interviews with AI-powered feedback
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #7A8A9F; font-size: 14px; line-height: 1.7; padding: 4px 0;">
                                <span style="color: #4FD1C7; margin-right: 8px;">•</span> Record and analyze your interview responses
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #7A8A9F; font-size: 14px; line-height: 1.7; padding: 4px 0;">
                                <span style="color: #4FD1C7; margin-right: 8px;">•</span> Track your progress over time
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #7A8A9F; font-size: 14px; line-height: 1.7; padding: 4px 0;">
                                <span style="color: #4FD1C7; margin-right: 8px;">•</span> Get personalized improvement suggestions
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, #4FD1C7 0%, #38A169 100%); border-radius: 8px; box-shadow: 0 4px 16px rgba(79, 209, 199, 0.3);">
                          <a href="${dashboardUrl}" style="display: inline-block; color: #0A0E1A; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; line-height: 1.5;">Get Started</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Support text -->
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <p style="color: #7A8A9F; font-size: 13px; margin: 0; line-height: 1.5;">If you have any questions, feel free to reach out to our support team.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(15, 20, 31, 0.5); padding: 20px 24px; text-align: center; border-top: 1px solid rgba(42, 49, 66, 0.5);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 6px;">
                    <p style="color: #7A8A9F; font-size: 11px; margin: 0; line-height: 1.4;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="color: #7A8A9F; font-size: 11px; margin: 0; line-height: 1.4;">This email was sent because you created an account with ${APP_NAME}.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const allowedOrigins: string[] = [];

  // Add allowed origins from environment variables
  if (process.env.VITE_APP_URL) {
    allowedOrigins.push(process.env.VITE_APP_URL);
  }

  if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins.push(
      ...process.env.ALLOWED_ORIGINS.split(",").map((url) => url.trim())
    );
  }

  // Add local development URLs if in development mode
  if (process.env.NODE_ENV === "development" || !process.env.VERCEL) {
    if (process.env.VITE_DEV_ORIGINS) {
      allowedOrigins.push(
        ...process.env.VITE_DEV_ORIGINS.split(",").map((url) => url.trim())
      );
    }
  }

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check for required environment variables
  if (!process.env.RESEND_API_KEY) {
    console.error("Resend API key not configured");
    return res.status(500).json({ error: "Email service not configured" });
  }

  if (!EMAIL_FROM) {
    console.error("EMAIL_FROM not configured");
    return res.status(500).json({ error: "Email FROM address not configured" });
  }

  if (!APP_NAME) {
    console.error("APP_NAME not configured");
    return res.status(500).json({ error: "App name not configured" });
  }

  try {
    const { email, userName, dashboardUrl } = req.body;

    // Validate required fields
    if (!email || !userName) {
      return res.status(400).json({ error: "Email and userName are required" });
    }

    // Validate dashboardUrl is provided
    if (!dashboardUrl) {
      return res.status(400).json({ error: "Dashboard URL is required" });
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `Welcome to ${APP_NAME}!`,
      html: createWelcomeEmailHTML(userName, dashboardUrl),
    });

    return res.status(200).json({
      success: true,
      message: "Welcome email sent successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return res.status(500).json({
      error: "Failed to send email",
      details: error.message,
    });
  }
}
