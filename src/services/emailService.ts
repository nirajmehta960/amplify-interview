// Email service — calls FastAPI backend to send transactional emails

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
  try {
    const response = await fetch(`${API_BASE_URL}/api/email/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        user_name: userName,
        dashboard_url: dashboardUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    return {};
  } catch (error: any) {
    // Don't block signup if email fails
    console.error("Failed to send welcome email:", error.message || error);
    return { error: error as Error };
  }
}
