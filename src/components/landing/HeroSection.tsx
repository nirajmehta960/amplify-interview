import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle, ArrowRight, Play, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function HeroSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        } else {
          setProfile({
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfile({
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        });
      }
    };

    fetchProfile();
  }, [user]);

  const features = [
    "Custom question banks",
    "Video recording & analysis",
    "AI-powered feedback & scoring"
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow effects */}
      <div className="hero-glow top-1/4 left-1/4 animate-glow-pulse" />
      <div className="hero-glow bottom-1/4 right-1/4 animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(222_30%_18%/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(222_30%_18%/0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Advanced AI Interview Coaching</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 sm:mb-6 px-4 sm:px-0"
          >
            {user ? (
              <>
                Welcome back,{" "}
                <span className="gradient-text">
                  {profile?.full_name || user.email?.split("@")[0] || "User"}
                </span>
                !
              </>
            ) : (
              <>
                Master Interviews with{" "}
                <span className="gradient-text">AI-Powered Coaching</span>
              </>
            )}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            {user ? (
              <>
                Ready to practice? Start a new interview session or review your
                progress. Your personalized AI coach is here to help you excel.
              </>
            ) : (
              <>
                Create custom question banks, practice with video recording, and get detailed AI analysis. 
                Track your progress with comprehensive analytics and master any interview type.
              </>
            )}
          </motion.p>

          {/* Features list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-6 mb-10"
          >
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {user ? (
              <>
                <Button variant="hero" size="xl" onClick={() => navigate("/interview/setup")} className="gap-2">
                  <Play className="w-5 h-5" />
                  Start New Interview
                </Button>
                <Button variant="glass" size="xl" onClick={() => navigate("/dashboard")} className="gap-2">
                  <BarChart3 className="w-5 h-5" />
                  View Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button variant="hero" size="xl" onClick={() => navigate("/interview/setup")} className="gap-2">
                  Start Free Interview
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button variant="glass" size="xl" asChild>
                  <a href="#how-it-works">
                    See How It Works
                  </a>
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

