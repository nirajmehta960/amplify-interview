// Email service - calls serverless API endpoint to avoid CORS issues

// Get API endpoint URL (works for both local development and production)
const getApiUrl = () => {
  // Check for explicit API URL setting
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const origin = window.location.origin;

  // For production/Vercel, use same origin (API routes are on same domain)
  if (
    origin.includes("vercel.app") ||
    (!origin.includes("localhost") && !origin.includes("127.0.0.1"))
  ) {
    return origin; // Use same origin for API routes
  }

  // For local development, check for Vercel dev URL
  if (import.meta.env.VITE_VERCEL_DEV_URL) {
    return import.meta.env.VITE_VERCEL_DEV_URL;
  }

  // For local development:
  // - If accessing via Vercel dev (port 3000), use same origin
  // - If accessing via Vite, check for explicit dev API URL
  if (origin.includes(":8080") || origin.includes(":5173")) {
    // Try environment variable first, then default to localhost:3000 only if explicitly set
    const devApiUrl = import.meta.env.VITE_DEV_API_URL;
    if (devApiUrl) {
      return devApiUrl;
    }
    // Fallback to same origin for local development
    return origin;
  }

  // Default: same origin (works when using Vercel dev)
  return origin;
};

// Email template is now in the serverless function (api/send-welcome-email.ts)
// Email service - calls API endpoint to avoid CORS

export interface SendWelcomeEmailParams {
  email: string;
  userName: string;
  dashboardUrl?: string;
}

export async function sendWelcomeEmail({
  email,
  userName,
  dashboardUrl = `${window.location.origin}/dashboard`,
}: SendWelcomeEmailParams): Promise<{ error?: Error }> {
  const apiUrl = getApiUrl();
  const endpoint = `${apiUrl}/api/send-welcome-email`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        userName,
        dashboardUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error || `HTTP error! status: ${response.status}`;
      console.error("Welcome email API error:", errorMessage, errorData);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return {};
  } catch (error: any) {
    // Log error for debugging but don't throw - we don't want to block signup if email fails
    console.error("Failed to send welcome email:", error.message || error);
    return { error: error as Error };
  }
}
