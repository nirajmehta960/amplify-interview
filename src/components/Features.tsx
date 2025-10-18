import { motion } from "framer-motion";
import { Brain, MessageSquare, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description:
        "Get detailed AI feedback on your interview responses using advanced language models. Our system analyzes your communication style, content quality, and provides specific improvement recommendations.",
      benefits: [
        "Real-time response analysis",
        "Detailed communication feedback",
        "Personalized improvement suggestions",
        "Score-based performance evaluation",
      ],
    },
    {
      icon: MessageSquare,
      title: "Custom Question Bank",
      description:
        "Create and manage your own practice questions or choose from our curated database. Practice with behavioral, technical, leadership, and custom domain-specific questions tailored to your career goals.",
      benefits: [
        "Personal question bank creation",
        "Behavioral, technical & leadership questions",
        "Custom domain selection (PM, Engineer, etc.)",
        "Question categorization & management",
      ],
    },
    {
      icon: TrendingUp,
      title: "Comprehensive Analytics",
      description:
        "Track your interview performance with detailed analytics, session history, and progress insights. View your improvement over time with visual charts and performance metrics.",
      benefits: [
        "Session history & performance tracking",
        "Visual progress charts & analytics",
        "Score trends & improvement metrics",
        "Interview readiness assessment",
      ],
    },
  ];

  return (
    <section id="features" className="py-24 relative bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-dark-navy font-display">
            Everything You Need to{" "}
            <span className="text-primary-blue">Ace Your Interview</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            From custom question banks to AI-powered analysis, get comprehensive
            interview preparation tools designed for real success
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="bg-white p-8 h-full hover:shadow-professional-lg transition-all duration-300 border border-light-gray rounded-professional">
                <div className="w-16 h-16 rounded-professional bg-primary-blue flex items-center justify-center mb-6 shadow-professional">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-dark-navy font-display">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li
                      key={benefitIndex}
                      className="flex items-center gap-2 text-sm text-dark-navy"
                    >
                      <div className="w-1.5 h-1.5 bg-accent-green rounded-full flex-shrink-0"></div>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
