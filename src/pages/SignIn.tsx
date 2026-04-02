import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Mic,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

  return (
    <>
      <Helmet>
        <title>Sign In - Amplify Interview</title>
        <meta name="description" content="Sign in to continue your interview practice." />
      </Helmet>

      <div className="min-h-screen flex bg-background">
        {/* Left: Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-10 relative overflow-hidden">
          {/* Soft ambient glow */}
          <div
            className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-60"
            style={{
              background: "radial-gradient(circle, hsl(231 72% 52% / 0.10) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-60"
            style={{
              background: "radial-gradient(circle, hsl(172 72% 38% / 0.10) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md relative z-10"
          >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 mb-10">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Mic className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display font-semibold text-lg text-foreground block leading-tight">
                  Amplify Interview
                </span>
                <p className="text-xs text-muted-foreground">AI-Powered Mock Interviews</p>
              </div>
            </Link>

            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold text-foreground mb-2 tracking-tight">
                Welcome back
              </h1>
              <p className="text-muted-foreground">Sign in to continue your interview practice.</p>
            </div>

            <div className="glass-card p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 bg-card"
                      required
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 bg-card"
                      required
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-muted-foreground">Remember me</span>
                  </label>
                  <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>

                <Button variant="hero" size="lg" className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                  <span className="bg-background px-3 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full bg-card"
                type="button"
                onClick={async () => {
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
                }}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <svg className="w-5 h-5 mr-2 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an account?{" "}
                <Link to="/auth/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right: Visual panel */}
        <div
          className="hidden lg:flex flex-1 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, hsl(231 72% 52%) 0%, hsl(250 72% 60%) 50%, hsl(172 72% 38%) 100%)",
          }}
        >
          {/* Decorative grid */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* Floating orbs */}
          <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Trusted by 50,000+ candidates
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h2 className="font-display text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-4">
                  Land your dream job with confidence.
                </h2>
                <p className="text-lg text-white/80 max-w-md">
                  Practice with realistic AI mock interviews and get instant, actionable feedback to ace every round.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 max-w-md">
                {[
                  { icon: TrendingUp, title: "Real-time scoring", desc: "Content, clarity, structure & confidence" },
                  { icon: ShieldCheck, title: "Industry-specific questions", desc: "Tailored to your role & seniority" },
                  { icon: Star, title: "Detailed playback & insights", desc: "Review every answer with AI feedback" },
                ].map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <f.icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{f.title}</p>
                      <p className="text-sm text-white/70">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <div className="space-y-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-white text-white" />
                ))}
                <span className="text-sm text-white/80 ml-2">4.9 / 5 from 2,400+ reviews</span>
              </div>
              <blockquote className="text-white/90 italic text-sm max-w-md">
                "Amplify helped me land offers at two FAANG companies. The AI feedback felt like having a senior coach on demand."
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-semibold text-sm">
                  SM
                </div>
                <div>
                  <p className="text-sm font-semibold">Sarah Mitchell</p>
                  <p className="text-xs text-white/70">Senior PM · Hired at Google</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignIn;
