// Vercel Serverless Function to send welcome emails via Resend
// This avoids CORS issues by calling Resend API from server-side

import { Resend } from "resend";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM;
const APP_NAME = process.env.APP_NAME;

// Welcome email template
const createWelcomeEmailHTML = (userName: string, dashboardUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${APP_NAME}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0A0E1A;">
  <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, rgba(15, 20, 31, 0.8) 0%, rgba(10, 14, 26, 0.6) 100%); border: 1px solid rgba(42, 49, 66, 0.5); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(79, 209, 199, 0.15);">
    
    <!-- Header with gradient -->
    <div style="background: linear-gradient(135deg, #4FD1C7 0%, #38A169 100%); padding: 40px 32px; text-align: center; position: relative; overflow: hidden;">
      <div style="position: absolute; top: -50%; right: -50%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(79, 209, 199, 0.15) 0%, transparent 70%); filter: blur(80px); pointer-events: none;"></div>
      <h1 style="color: #0A0E1A; font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.025em; position: relative; z-index: 1;">${APP_NAME}</h1>
      <p style="color: #0A0E1A; font-size: 16px; margin: 0; opacity: 0.9; position: relative; z-index: 1;">AI-Powered Interview Preparation</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 32px; text-align: center;">
      <h2 style="color: #F7F9FC; font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Welcome, ${userName}!</h2>
      
      <p style="color: #7A8A9F; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">
        Thank you for joining ${APP_NAME}! We're excited to help you prepare for your next interview with AI-powered coaching and feedback.
      </p>
      
      <!-- Feature card with glass morphism effect -->
      <div style="background: linear-gradient(135deg, rgba(15, 20, 31, 0.8) 0%, rgba(10, 14, 26, 0.6) 100%); border: 1px solid rgba(42, 49, 66, 0.5); border-radius: 12px; padding: 24px; margin: 32px 0; text-align: left; box-shadow: 0 4px 20px rgba(79, 209, 199, 0.1);">
        <h3 style="color: #F7F9FC; font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">What you can do:</h3>
        <ul style="color: #7A8A9F; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Practice mock interviews with AI-powered feedback</li>
          <li>Record and analyze your interview responses</li>
          <li>Track your progress over time</li>
          <li>Get personalized improvement suggestions</li>
        </ul>
      </div>
      
      <!-- CTA Button with gradient and glow -->
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #4FD1C7 0%, #38A169 100%); color: #0A0E1A; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 600; margin: 24px 0; box-shadow: 0 4px 20px rgba(79, 209, 199, 0.3), 0 0 40px rgba(79, 209, 199, 0.15); transition: all 0.3s ease;">
        Get Started
      </a>
      
      <p style="color: #7A8A9F; font-size: 14px; margin: 32px 0 0 0; line-height: 1.5;">
        If you have any questions, feel free to reach out to our support team. We're here to help!
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: rgba(15, 20, 31, 0.5); padding: 24px 32px; text-align: center; border-top: 1px solid rgba(42, 49, 66, 0.5);">
      <p style="color: #7A8A9F; font-size: 12px; margin: 0 0 8px 0;">
        © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      </p>
      <p style="color: #7A8A9F; font-size: 12px; margin: 0;">
        This email was sent because you created an account with ${APP_NAME}.
      </p>
    </div>
    
  </div>
</body>
</html>
`;

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
