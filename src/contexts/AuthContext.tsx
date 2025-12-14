import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { sendWelcomeEmail } from "@/services/emailService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // Track users we've already sent welcome emails to (prevents duplicates)
  // Use a combination of ref (for current session) and localStorage (persistent)
  const welcomeEmailSentRef = useRef<Set<string>>(new Set());
  const emailSendingInProgressRef = useRef<Set<string>>(new Set());

  // Helper function to check if welcome email was already sent
  const hasWelcomeEmailBeenSent = (userId: string): boolean => {
    // Check ref first (fast, for current session)
    if (welcomeEmailSentRef.current.has(userId)) {
      return true;
    }

    // Check localStorage (persistent across sessions)
    try {
      const sentEmails = JSON.parse(
        localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
      );
      if (sentEmails.includes(userId)) {
        // Also add to ref for faster access
        welcomeEmailSentRef.current.add(userId);
        return true;
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    return false;
  };

  // Helper function to mark welcome email as sent
  const markWelcomeEmailAsSent = (userId: string): void => {
    // Mark in ref immediately
    welcomeEmailSentRef.current.add(userId);

    // Mark in localStorage for persistence
    try {
      const sentEmails = JSON.parse(
        localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
      );
      if (!sentEmails.includes(userId)) {
        sentEmails.push(userId);
        localStorage.setItem(
          "amplify_welcomeEmailsSent",
          JSON.stringify(sentEmails)
        );
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }

      // Handle specific auth events
      if (event === "SIGNED_OUT") {
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Handle OAuth callback redirect
        if (
          window.location.hash &&
          window.location.hash.includes("#access_token")
        ) {
          // Always stay on the current origin (works for both local and production)
          // Clean up hash and navigate to dashboard
          const currentOrigin = window.location.origin;
          window.history.replaceState(null, "", "/dashboard");
          navigate("/dashboard", { replace: true });
        }

        // Check if this is a new user
        if (mounted && session?.user) {
          const user = session.user;
          const userId = user.id;

          // Check if welcome email already sent or sending in progress
          const alreadySentEmail = hasWelcomeEmailBeenSent(userId);
          const isSendingInProgress =
            emailSendingInProgressRef.current.has(userId);

          if (alreadySentEmail || isSendingInProgress) {
            // Already sent or sending in progress
            const currentPath = window.location.pathname;
            if (
              currentPath === "/auth/signin" ||
              currentPath === "/auth/signup"
            ) {
              navigate("/dashboard", { replace: true });
            }
            return;
          }

          // Check if this is a new user (created within last 5 minutes)
          const userCreatedAt = new Date(user.created_at);
          const now = new Date();
          const timeSinceCreation =
            (now.getTime() - userCreatedAt.getTime()) / 1000; // seconds
          const isNewUser = timeSinceCreation < 300; // 5 minutes

          if (isNewUser && user.email) {
            const userName =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "there";

            // Mark as sending in progress to prevent duplicates
            emailSendingInProgressRef.current.add(userId);
            markWelcomeEmailAsSent(userId);

            const dashboardUrl = `${window.location.origin}/dashboard`;

            // Send welcome email asynchronously (don't block the UI)
            sendWelcomeEmail({
              email: user.email,
              userName: userName,
              dashboardUrl: dashboardUrl,
            })
              .then((result) => {
                if (result.error) {
                  console.error(
                    "Welcome email failed for user:",
                    userId,
                    result.error
                  );
                  // On error, remove from sent list so we can retry later
                  welcomeEmailSentRef.current.delete(userId);
                  try {
                    const sentEmails = JSON.parse(
                      localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
                    );
                    const filtered = sentEmails.filter(
                      (id: string) => id !== userId
                    );
                    localStorage.setItem(
                      "amplify_welcomeEmailsSent",
                      JSON.stringify(filtered)
                    );
                  } catch (e) {
                    // Ignore errors
                  }
                } else {
                }
                // Remove from in-progress set
                emailSendingInProgressRef.current.delete(userId);
              })
              .catch((error) => {
                console.error(
                  "Welcome email exception for user:",
                  userId,
                  error
                );
                // On error, remove from sent list so we can retry later
                welcomeEmailSentRef.current.delete(userId);
                try {
                  const sentEmails = JSON.parse(
                    localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
                  );
                  const filtered = sentEmails.filter(
                    (id: string) => id !== userId
                  );
                  localStorage.setItem(
                    "amplify_welcomeEmailsSent",
                    JSON.stringify(filtered)
                  );
                } catch (e) {
                  // Ignore errors
                }
                // Remove from in-progress set
                emailSendingInProgressRef.current.delete(userId);
              });
          }

          // Navigate to dashboard if user is authenticated and on auth pages (typically after OAuth)
          const currentPath = window.location.pathname;
          if (
            currentPath === "/auth/signin" ||
            currentPath === "/auth/signup"
          ) {
            navigate("/dashboard", { replace: true });
          }
        }
      }
    });

    // Check for existing session
    const initializeAuth = async () => {
      try {
        // Load previously sent welcome emails from localStorage
        try {
          const sentEmails = JSON.parse(
            localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
          );
          sentEmails.forEach((id: string) => {
            welcomeEmailSentRef.current.add(id);
          });
        } catch (e) {
          // Ignore localStorage errors
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data?.user) {
      navigate("/dashboard");
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // Always use window.location.origin for redirects (works for both local and production)
    const baseUrl = window.location.origin;
    const redirectUrl = `${baseUrl}/dashboard`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error) {
      navigate("/dashboard");
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}/dashboard`;

      // Supabase automatically links accounts with the same email address by default
      // No additional configuration needed - automatic linking is enabled by default
      // If you want manual linking, enable it in: Authentication > Settings > "Enable Manual Linking"
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
          // This allows account linking when email matches an existing account
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error("Google OAuth error:", error);
        // If user already exists with email/password, suggest using email login
        if (
          error.message?.includes("already registered") ||
          error.message?.includes("email already exists")
        ) {
          return {
            error: {
              ...error,
              message:
                "An account with this email already exists. Please sign in with your password or try Google sign-in again to link accounts.",
            },
          };
        }
      }

      return { error };
    } catch (error) {
      console.error("Google OAuth exception:", error);
      return { error: error as Error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Always use window.location.origin for redirects (works for both local and production)
      const baseUrl = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/reset-password`,
      });

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      // Clear local state immediately
      setUser(null);
      setSession(null);

      // Sign out from Supabase
      await supabase.auth.signOut();

      // Navigate to sign in page
      navigate("/auth/signin", { replace: true });

      // Clear any local storage
      localStorage.removeItem("currentSession");
    } catch (error) {
      // Even if there's an error, clear local state and navigate
      setUser(null);
      setSession(null);
      navigate("/auth/signin", { replace: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
