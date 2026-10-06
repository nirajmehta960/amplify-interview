import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField, TextField } from "@/components/auth/fields";
import { GoogleButton, OrDivider } from "@/components/auth/social";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle, user, loading } = useAuth();
  const { toast } = useToast();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = signInSchema.parse({ email, password });
      setIsLoading(true);

      const { error } = await signIn(validated.email, validated.password);

      if (error) {
        const code = error.code || "";
        let errorMessage = "An unexpected error occurred. Please try again.";

        if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
          errorMessage = "Invalid email or password. Please check your credentials or try signing in with Google.";
        } else if (code === "auth/too-many-requests") {
          errorMessage = "Too many failed attempts. Please wait a moment before trying again.";
        } else if (code === "auth/user-disabled") {
          errorMessage = "This account has been disabled. Please contact support.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast({
          title: "Sign in failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        const code = error.code || "";
        // popup-closed-by-user is not an error — user just dismissed
        if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
          toast({
            title: "Sign in failed",
            description: error.message || "Failed to sign in with Google. Please try again.",
            variant: "destructive",
          });
        }
        setIsGoogleLoading(false);
      }
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your interview practice."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/auth/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div>
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="mt-2 flex justify-end">
            <Link to="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button size="lg" className="h-11 w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
          {!isLoading && <ArrowRight className="ml-2 size-4" aria-hidden="true" />}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton
        loading={isGoogleLoading}
        loadingLabel="Signing in..."
        disabled={isGoogleLoading || isLoading}
        onClick={handleGoogle}
      />
    </AuthShell>
  );
};

export default SignIn;
