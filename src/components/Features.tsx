import { motion } from "framer-motion";
import { Brain, MessageSquare, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description:
        "Advanced AI algorithms analyze your responses, body language, and communication skills to provide comprehensive feedback.",
    },
    {
      icon: MessageSquare,
      title: "Real-time Feedback",
      description:
        "Get instant feedback on your answers, with suggestions for improvement and best practices from top industry experts.",
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description:
        "Monitor your improvement over time with detailed analytics, performance metrics, and personalized insights.",
    },
  ];

  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Powerful Features for{" "}
            <span className="gradient-text">Interview Success</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to ace your next interview, powered by
            cutting-edge AI technology
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
              whileHover={{ scale: 1.05, y: -10 }}
            >
              <Card className="glass p-8 h-full hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary/20">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-lg"
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
