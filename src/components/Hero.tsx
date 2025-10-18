import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle, BarChart3, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        // First try to get from profiles table
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        } else {
          // Fallback to user metadata if no profile exists
          setProfile({
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Fallback to user metadata
        setProfile({
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        });
      }
    };

    fetchProfile();
  }, [user]);

  const floatingAnimation = {
    y: [0, -20, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 bg-light-gray">
      {/* Clean Professional Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-light-gray via-white to-light-gray" />

      {/* Subtle Professional Elements */}
      <motion.div
        animate={floatingAnimation}
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-blue/5 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          y: [0, -20, 0],
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut" as const,
            delay: 1,
          },
        }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl"
      />

      {/* Content */}
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-professional bg-white shadow-professional border border-light-gray mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary-blue" />
            <span className="text-sm font-medium text-dark-navy">
              Advanced AI Interview Coaching
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-dark-navy font-display"
          >
            {user ? (
              <>
                Welcome back,{" "}
                <span className="text-primary-blue">
                  {profile?.full_name || user.email?.split("@")[0] || "User"}
                </span>
                !
              </>
            ) : (
              <>
                Master Interviews with{" "}
                <span className="text-primary-blue">AI-Powered Coaching</span>
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto"
          >
            {user ? (
              <>
                Ready to practice? Start a new interview session or review your
                progress. Your personalized AI coach is here to help you excel.
              </>
            ) : (
              <>
                Create custom question banks, practice with video recording, and
                get detailed AI analysis. Track your progress with comprehensive
                analytics and master any interview type.
              </>
            )}
          </motion.p>

          {/* Key Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto"
          >
            {[
              "Custom question banks",
              "Video recording & analysis",
              "AI-powered feedback & scoring",
            ].map((benefit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 justify-center md:justify-start"
              >
                <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0" />
                <span className="text-sm font-medium text-dark-navy">
                  {benefit}
                </span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex justify-center items-center gap-4"
          >
            {user ? (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate("/interview/setup")}
                  className="bg-primary-blue hover:bg-primary-blue/90 text-white text-lg px-10 py-6 rounded-professional shadow-professional hover:shadow-professional-lg transition-all hover:scale-105 font-medium"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start New Interview
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="border-2 border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white text-lg px-10 py-6 rounded-professional shadow-professional hover:shadow-professional-lg transition-all hover:scale-105 font-medium"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  View Dashboard
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                onClick={() => navigate("/interview/setup")}
                className="bg-primary-blue hover:bg-primary-blue/90 text-white text-lg px-10 py-6 rounded-professional shadow-professional hover:shadow-professional-lg transition-all hover:scale-105 font-medium"
              >
                Start Free Interview
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
