import { useAuth } from "@/contexts/AuthContext";

export interface LandingRoutes {
  signedIn: boolean;
  /** Where "start" CTAs go: straight to setup for members, sign-up for visitors. */
  start: string;
  signIn: string;
  signUp: string;
  dashboard: string;
}

export function useLandingRoutes(): LandingRoutes {
  const { user } = useAuth();
  const signedIn = Boolean(user);
  return {
    signedIn,
    start: signedIn ? "/interview/setup" : "/auth/signup",
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    dashboard: "/dashboard",
  };
}
