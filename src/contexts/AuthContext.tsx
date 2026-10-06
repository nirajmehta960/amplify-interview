import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { sendWelcomeEmail } from "@/services/emailService";

interface CustomUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: CustomUser | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  confirmResetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<{ error: any }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const COGNITO_REGION = import.meta.env.VITE_AWS_REGION || "us-east-1";
const COGNITO_CLIENT_ID = import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || "";
const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

async function cognitoRequest(action: string, payload: Record<string, any>) {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.__type || "AWS Cognito error");
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const welcomeEmailSentRef = useRef<Set<string>>(new Set());
  const emailSendingInProgressRef = useRef<Set<string>>(new Set());

  const isMockMode = !COGNITO_CLIENT_ID;

  const hasWelcomeEmailBeenSent = (uid: string): boolean => {
    if (welcomeEmailSentRef.current.has(uid)) return true;
    try {
      const sent = JSON.parse(
        localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
      );
      if (sent.includes(uid)) {
        welcomeEmailSentRef.current.add(uid);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const markWelcomeEmailAsSent = (uid: string): void => {
    welcomeEmailSentRef.current.add(uid);
    try {
      const sent = JSON.parse(
        localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
      );
      if (!sent.includes(uid)) {
        sent.push(uid);
        localStorage.setItem("amplify_welcomeEmailsSent", JSON.stringify(sent));
      }
    } catch {
      // ignore
    }
  };

  // Restore session on mount
  useEffect(() => {
    try {
      const sent = JSON.parse(
        localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
      );
      sent.forEach((id: string) => welcomeEmailSentRef.current.add(id));
    } catch {
      // ignore
    }

    const token = localStorage.getItem("amplify_id_token");
    if (token) {
      if (token === "mock-user-token") {
        setUser({
          uid: "mock-user-uid",
          email: "mock@example.com",
          displayName: "Mock User",
        });
      } else {
        const claims = parseJwt(token);
        if (claims && claims.exp * 1000 > Date.now()) {
          const uid = claims.sub;
          const email = claims.email;
          const displayName = claims.name || claims["cognito:username"] || email?.split("@")[0] || "User";
          setUser({ uid, email, displayName });
        } else {
          // Token expired, cleanup
          localStorage.removeItem("amplify_id_token");
          localStorage.removeItem("amplify_access_token");
          localStorage.removeItem("amplify_refresh_token");
        }
      }
    }
    setLoading(false);
  }, []);

  // Welcome email trigger side-effect
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const justSignedUp = localStorage.getItem("amplify_just_signed_up") === "true";

    if (
      user.email &&
      justSignedUp &&
      !hasWelcomeEmailBeenSent(uid) &&
      !emailSendingInProgressRef.current.has(uid)
    ) {
      emailSendingInProgressRef.current.add(uid);
      markWelcomeEmailAsSent(uid);
      localStorage.removeItem("amplify_just_signed_up");

      const userName = user.displayName || user.email.split("@")[0] || "there";

      sendWelcomeEmail({
        email: user.email,
        userName,
        dashboardUrl: `${window.location.origin}/dashboard`,
      })
        .catch((err) => {
          console.error("Welcome email failed:", err);
          welcomeEmailSentRef.current.delete(uid);
          try {
            const sent = JSON.parse(
              localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
            );
            localStorage.setItem(
              "amplify_welcomeEmailsSent",
              JSON.stringify(sent.filter((id: string) => id !== uid))
            );
          } catch {
            // ignore
          }
        })
        .finally(() => {
          emailSendingInProgressRef.current.delete(uid);
        });
    }
  }, [user]);

  const signIn = async (email: string, password: string) => {
    if (isMockMode) {
      localStorage.setItem("amplify_id_token", "mock-user-token");
      const loggedUser = {
        uid: "mock-user-uid",
        email: email,
        displayName: email.split("@")[0],
      };
      setUser(loggedUser);
      navigate("/dashboard");
      return { error: null };
    }

    try {
      const data = await cognitoRequest("InitiateAuth", {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const authResult = data.AuthenticationResult;
      localStorage.setItem("amplify_id_token", authResult.IdToken);
      localStorage.setItem("amplify_access_token", authResult.AccessToken);
      if (authResult.RefreshToken) {
        localStorage.setItem("amplify_refresh_token", authResult.RefreshToken);
      }

      const claims = parseJwt(authResult.IdToken);
      const loggedUser = {
        uid: claims.sub,
        email: claims.email,
        displayName: claims.name || claims["cognito:username"] || claims.email?.split("@")[0] || "User",
      };
      setUser(loggedUser);
      navigate("/dashboard");
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ) => {
    if (isMockMode) {
      localStorage.setItem("amplify_id_token", "mock-user-token");
      localStorage.setItem("amplify_just_signed_up", "true");
      const loggedUser = {
        uid: "mock-user-uid",
        email: email,
        displayName: fullName,
      };
      setUser(loggedUser);
      navigate("/dashboard");
      return { error: null };
    }

    try {
      // 1. Sign Up in Cognito
      await cognitoRequest("SignUp", {
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "name", Value: fullName },
        ],
      });

      // Note: Cognito requires email verification by default. If auto-confirm is enabled in
      // your User Pool, we can log in immediately. Otherwise, Cognito Hosted UI or verification
      // flow is needed. Here we try to log in immediately as planned.
      const res = await signIn(email, password);
      if (!res.error) {
        localStorage.setItem("amplify_just_signed_up", "true");
      }
      return res;
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    // Under AWS Cognito, Federated Google Sign-In is typically routed via Cognito Hosted UI
    // Example Redirect:
    // https://<your-domain>.auth.<region>.amazoncognito.com/oauth2/authorize?identity_provider=Google&redirect_uri=<your-redirect-uri>&response_type=token&client_id=<your-client-id>&scope=email+openid+profile
    alert("Google Sign-In under AWS Cognito requires Hosted UI redirect. Redirecting to mock login for now.");
    return signIn("google-user@example.com", "MockPassword123!");
  };

  const resetPassword = async (email: string) => {
    if (isMockMode) {
      return { error: null };
    }

    try {
      await cognitoRequest("ForgotPassword", {
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
      });
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const confirmResetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    if (isMockMode) {
      return { error: null };
    }

    try {
      await cognitoRequest("ConfirmForgotPassword", {
        ClientId: COGNITO_CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      const accessToken = localStorage.getItem("amplify_access_token");
      if (accessToken && !isMockMode) {
        try {
          await cognitoRequest("GlobalSignOut", {
            AccessToken: accessToken,
          });
        } catch {
          // ignore
        }
      }
    } finally {
      setUser(null);
      localStorage.removeItem("amplify_id_token");
      localStorage.removeItem("amplify_access_token");
      localStorage.removeItem("amplify_refresh_token");
      localStorage.removeItem("currentSession");
      navigate("/auth/signin", { replace: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, signIn, signUp, signInWithGoogle, signOut, resetPassword, confirmResetPassword, loading }}
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
