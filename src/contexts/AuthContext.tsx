import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { sendWelcomeEmail } from "@/services/emailService";

interface AuthContextType {
  user: User | null;
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const welcomeEmailSentRef = useRef<Set<string>>(new Set());
  const emailSendingInProgressRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    // Preload previously-sent set from localStorage
    try {
      const sent = JSON.parse(
        localStorage.getItem("amplify_welcomeEmailsSent") || "[]"
      );
      sent.forEach((id: string) => welcomeEmailSentRef.current.add(id));
    } catch {
      // ignore
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (!firebaseUser) return;

      const uid = firebaseUser.uid;

      // Redirect away from auth pages on sign-in
      const path = window.location.pathname;
      if (path === "/auth/signin" || path === "/auth/signup") {
        navigate("/dashboard", { replace: true });
      }

      // Send welcome email to new users (created within last 5 min)
      if (
        firebaseUser.email &&
        !hasWelcomeEmailBeenSent(uid) &&
        !emailSendingInProgressRef.current.has(uid)
      ) {
        const createdMs = firebaseUser.metadata.creationTime
          ? new Date(firebaseUser.metadata.creationTime).getTime()
          : 0;
        const isNewUser = Date.now() - createdMs < 300_000;

        if (isNewUser) {
          emailSendingInProgressRef.current.add(uid);
          markWelcomeEmailAsSent(uid);

          const userName =
            firebaseUser.displayName ||
            firebaseUser.email.split("@")[0] ||
            "there";

          sendWelcomeEmail({
            email: firebaseUser.email,
            userName,
            dashboardUrl: `${window.location.origin}/dashboard`,
          })
            .catch((err) => {
              console.error("Welcome email failed:", err);
              // Allow retry by clearing the sent marker
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
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(newUser, { displayName: fullName });
      navigate("/dashboard");
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("email");
      provider.addScope("profile");
      await signInWithPopup(auth, provider);
      navigate("/dashboard");
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      await firebaseSignOut(auth);
      localStorage.removeItem("currentSession");
      navigate("/auth/signin", { replace: true });
    } catch {
      setUser(null);
      navigate("/auth/signin", { replace: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, signIn, signUp, signInWithGoogle, signOut, resetPassword, loading }}
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
