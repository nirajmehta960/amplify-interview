import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Check, Mail, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordField, TextField } from '@/components/auth/fields';
import { GoogleButton, OrDivider } from '@/components/auth/social';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

/** Segment colours for strength 1-4, on the shared score scale. */
const STRENGTH_FILL = ['bg-destructive', 'bg-warning', 'bg-accent/70', 'bg-accent'];

const SignUp = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signUp, signInWithGoogle, user, loading } = useAuth();
  const { toast } = useToast();

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return { strength, label: labels[strength - 1] || '' };
  };

  const passwordStrength = getPasswordStrength();
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptTerms) {
      toast({
        title: 'Terms required',
        description: 'Please accept the terms and conditions',
        variant: 'destructive',
      });
      return;
    }

    try {
      const validated = signUpSchema.parse({
        fullName,
        email,
        password,
        confirmPassword,
      });

      setIsLoading(true);

      const { error } = await signUp(
        validated.email,
        validated.password,
        validated.fullName
      );

      if (error) {
        const code = error.code || "";
        let errorMessage = error.message || "An unexpected error occurred.";

        if (code === "auth/email-already-in-use") {
          errorMessage = "An account with this email already exists. Please sign in instead.";
        } else if (code === "auth/weak-password") {
          errorMessage = "Password is too weak. Please use at least 8 characters with a mix of letters and numbers.";
        } else if (code === "auth/invalid-email") {
          errorMessage = "Invalid email address. Please check and try again.";
        }

        toast({
          title: 'Sign up failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account created!',
          description: 'Welcome to Amplify Interview',
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation error',
          description: error.errors[0].message,
          variant: 'destructive',
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
        toast({
          title: 'Sign up failed',
          description: error.message || 'Failed to sign up with Google',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Sign up failed',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start practising with an interviewer that adapts to you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/auth/signin" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          id="fullName"
          label="Full name"
          icon={User}
          type="text"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

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

        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          hint={
            password ? (
              <div className="space-y-1.5">
                <div className="flex gap-1" aria-hidden="true">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        i <= passwordStrength.strength ? STRENGTH_FILL[passwordStrength.strength - 1] : 'bg-muted',
                      )}
                    />
                  ))}
                </div>
                {passwordStrength.label && (
                  <p className="text-xs text-muted-foreground">Password strength: {passwordStrength.label}</p>
                )}
              </div>
            ) : null
          }
        />

        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          hint={
            confirmPassword ? (
              <p
                aria-live="polite"
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium',
                  passwordsMatch ? 'text-score-high-text' : 'text-score-low-text',
                )}
              >
                {passwordsMatch ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  <X className="size-3.5" aria-hidden="true" />
                )}
                {passwordsMatch ? 'Passwords match' : "Passwords don't match"}
              </p>
            ) : null
          }
        />

        {/* No terms page exists yet, so this is plain text rather than a link
            that 404s. Restore the link when /terms ships. */}
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
            className="mt-0.5"
          />
          <label htmlFor="terms" className="cursor-pointer text-sm text-muted-foreground">
            I accept the terms and conditions
          </label>
        </div>

        <Button size="lg" className="h-11 w-full" type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton
        loading={isGoogleLoading}
        loadingLabel="Signing up..."
        disabled={isGoogleLoading || isLoading}
        onClick={handleGoogle}
      />
    </AuthShell>
  );
};

export default SignUp;
