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
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F5F7FA;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(28, 31, 42, 0.12);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3871C2 0%, #2d5a9d 100%); padding: 40px 32px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 32px; font-weight: 600; margin: 0 0 8px 0; letter-spacing: -0.025em;">${APP_NAME}</h1>
      <p style="color: #ffffff; font-size: 16px; margin: 0; opacity: 0.9;">AI-Powered Interview Preparation</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 32px; text-align: center;">
      <h2 style="color: #1C1F2A; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Welcome, ${userName}!</h2>
      
      <p style="color: #4a5568; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">
        Thank you for joining ${APP_NAME}! We're excited to help you prepare for your next interview with AI-powered coaching and feedback.
      </p>
      
      <div style="background-color: #F5F7FA; border-radius: 12px; padding: 24px; margin: 32px 0; text-align: left;">
        <h3 style="color: #1C1F2A; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">What you can do:</h3>
        <ul style="color: #4a5568; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Practice mock interviews with AI-powered feedback</li>
          <li>Record and analyze your interview responses</li>
          <li>Track your progress over time</li>
          <li>Get personalized improvement suggestions</li>
        </ul>
      </div>
      
      <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3871C2 0%, #2d5a9d 100%); color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 600; margin: 24px 0; box-shadow: 0 4px 12px rgba(56, 113, 194, 0.3);">
        Get Started
      </a>
      
      <p style="color: #718096; font-size: 14px; margin: 32px 0 0 0; line-height: 1.5;">
        If you have any questions, feel free to reach out to our support team. We're here to help!
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #F5F7FA; padding: 24px 32px; text-align: center; border-top: 1px solid #E2E8F0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px 0;">
        © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      </p>
      <p style="color: #718096; font-size: 12px; margin: 0;">
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
