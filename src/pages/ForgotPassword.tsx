import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/auth/fields";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const backToSignIn = (
  <Link to="/auth/signin" className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
    <ArrowLeft className="size-4" aria-hidden="true" />
    Back to sign in
  </Link>
);

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = forgotPasswordSchema.parse({ email });
      setIsLoading(true);

      const { error } = await resetPassword(validated.email);

      if (error) {
        toast({
          title: "Failed to send reset email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Reset email sent",
          description: "Check your email for password reset instructions.",
          variant: "default",
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

  if (emailSent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={
          <>
            We've sent password reset instructions to <span className="font-medium text-foreground">{email}</span>
          </>
        }
        footer={backToSignIn}
      >
        <div className="flex flex-col gap-5">
          <span className="grid size-12 place-items-center rounded-tile bg-accent/10">
            <MailCheck className="size-6 text-score-high-text" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <Button onClick={() => setEmailSent(false)} variant="outline" size="lg" className="h-11 w-full bg-card">
            Try a different email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a code to reset it."
      footer={backToSignIn}
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

        <Button size="lg" className="h-11 w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send reset code"}
        </Button>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
