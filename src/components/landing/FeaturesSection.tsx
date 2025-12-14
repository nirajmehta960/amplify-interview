import { motion } from "framer-motion";
import { Brain, MessageSquare, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Get detailed AI feedback on your interview responses using advanced language models. Our system analyzes your communication style, content quality, and provides specific improvement recommendations.",
    bullets: [
      "Real-time response analysis",
      "Detailed communication feedback",
      "Personalized improvement suggestions",
      "Score-based performance evaluation"
    ]
  },
  {
    icon: MessageSquare,
    title: "Custom Question Bank",
    description: "Create and manage your own practice questions or choose from our curated database. Practice with behavioral, technical, leadership, and custom domain-specific questions tailored to your career goals.",
    bullets: [
      "Personal question bank creation",
      "Behavioral, technical & leadership questions",
      "Custom domain selection (PM, Engineer, etc.)",
      "Question categorization & management"
    ]
  },
  {
    icon: TrendingUp,
    title: "Comprehensive Analytics",
    description: "Track your interview performance with detailed analytics, session history, and progress insights. View your improvement over time with visual charts and performance metrics.",
    bullets: [
      "Session history & performance tracking",
      "Visual progress charts & analytics",
      "Score trends & improvement metrics",
      "Interview readiness assessment"
    ]
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-20 lg:py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 px-4 sm:px-0">
            Everything You Need to{" "}
            <span className="gradient-text">Ace Your Interview</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From custom question banks to AI-powered analysis, get comprehensive interview preparation tools designed for real success
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card-hover p-8 group"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>

              {/* Title */}
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {feature.description}
              </p>

              {/* Bullets */}
              <ul className="space-y-2.5">
                {feature.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-muted-foreground">{bullet}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


