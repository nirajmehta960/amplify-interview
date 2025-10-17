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
            Powerful Features for{" "}
            <span className="text-primary-blue">Interview Success</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
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
              <Card className="bg-white p-10 h-full hover:shadow-professional-lg transition-all duration-300 border border-light-gray rounded-professional">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-16 h-16 rounded-professional bg-primary-blue flex items-center justify-center mb-8 shadow-professional"
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-6 text-dark-navy font-display">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
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
