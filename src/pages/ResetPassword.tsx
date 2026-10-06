import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField, TextField } from "@/components/auth/fields";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const resetPasswordSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    code: z.string().min(1, "Enter the verification code from your email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmResetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = resetPasswordSchema.parse({
        email,
        code,
        password,
        confirmPassword,
      });
      setIsLoading(true);

      const { error } = await confirmResetPassword(
        validated.email,
        validated.code,
        validated.password
      );

      if (error) {
        const name = error.name || error.__type || "";
        let message = "Failed to reset password. Please request a new code.";
        if (name.includes("CodeMismatch")) {
          message = "The verification code is incorrect. Please check and try again.";
        } else if (name.includes("ExpiredCode")) {
          message = "This code has expired. Please request a new one.";
        } else if (name.includes("InvalidPassword")) {
          message = "Password does not meet requirements. Use at least 8 characters.";
        } else if (name.includes("UserNotFound")) {
          message = "No account found for this email.";
        } else if (error.message) {
          message = error.message;
        }
        toast({ title: "Failed to reset password", description: message, variant: "destructive" });
        return;
      }

      toast({
        title: "Password reset successful",
        description: "Your password has been updated. Please sign in.",
      });
      navigate("/auth/signin", { replace: true });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: err.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to reset password",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Enter the verification code from your email and pick a new password."
      footer={
        <span className="flex flex-col items-center gap-2">
          <Link to="/auth/forgot-password" className="font-medium text-primary hover:underline">
            Request a new code
          </Link>
          <Link to="/auth/signin" className="hover:text-foreground">
            Back to sign in
          </Link>
        </span>
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

        <TextField
          id="code"
          label="Verification code"
          icon={KeyRound}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />

        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <Button size="lg" className="h-11 w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
