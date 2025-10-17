import { motion } from "framer-motion";
import { Brain, MessageSquare, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description:
        "Our AI analyzes your interview responses to provide detailed feedback on your communication style, content quality, and areas for improvement.",
      benefits: [
        "Response analysis",
        "Communication feedback",
        "Improvement suggestions",
      ],
    },
    {
      icon: MessageSquare,
      title: "Practice Sessions",
      description:
        "Practice with a variety of interview questions tailored to different industries and roles, helping you prepare for real interview scenarios.",
      benefits: [
        "Industry-specific questions",
        "Multiple interview types",
        "Realistic practice environment",
      ],
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description:
        "Track your interview practice sessions and see how your responses improve over time with detailed performance insights.",
      benefits: [
        "Session history",
        "Performance metrics",
        "Improvement tracking",
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
            Practice with{" "}
            <span className="text-primary-blue">AI-Powered Feedback</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Improve your interview skills with personalized practice sessions
            and detailed feedback
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
