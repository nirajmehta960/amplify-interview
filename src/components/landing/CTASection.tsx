import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function CTASection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-20 lg:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 p-8 sm:p-12 md:p-16 text-center"
        >
          {/* Glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Start for free today</span>
            </div>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Join thousands of professionals who have improved their interview skills with AI-powered coaching.
            </p>

            {user ? (
              <Button variant="hero" size="xl" onClick={() => navigate("/interview/setup")} className="gap-2">
                Start New Interview
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : (
              <Button variant="hero" size="xl" asChild className="gap-2">
                <Link to="/interview/setup">
                  Get Started Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}


