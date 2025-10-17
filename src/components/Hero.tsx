import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle } from "lucide-react";

const Hero = () => {
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
              AI-Powered Interview Preparation
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-dark-navy font-display"
          >
            Ace Your Next Interview with{" "}
            <span className="text-primary-blue">AI-Powered Practice</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto"
          >
            Practice your interview skills with our AI-powered coach. Get
            personalized feedback, work with real interview questions, and build
            your confidence for your next opportunity.
          </motion.p>

          {/* Key Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto"
          >
            {[
              "Real-time AI feedback",
              "Industry-specific questions",
              "Progress tracking & analytics",
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
            className="flex justify-center items-center"
          >
            <Button
              size="lg"
              onClick={() => (window.location.href = "/interview/setup")}
              className="bg-primary-blue hover:bg-primary-blue/90 text-white text-lg px-10 py-6 rounded-professional shadow-professional hover:shadow-professional-lg transition-all hover:scale-105 font-medium"
            >
              Start Free Interview
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
