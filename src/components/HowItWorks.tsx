import { motion } from "framer-motion";
import { UserPlus, Video, Mic, Award } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: UserPlus,
      title: "Sign Up",
      description:
        "Create your free account in seconds and set up your profile with your career goals.",
    },
    {
      icon: Video,
      title: "Choose Interview",
      description:
        "Select from various interview types tailored to your industry and experience level.",
    },
    {
      icon: Mic,
      title: "Practice & Record",
      description:
        "Answer questions naturally while our AI analyzes your responses in real-time.",
    },
    {
      icon: Award,
      title: "Get Feedback",
      description:
        "Receive detailed insights and personalized recommendations to improve your skills.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-light-gray">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-dark-navy font-display">
            How It <span className="text-primary-blue">Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Get started with your AI interview coach in four simple steps
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          {/* Timeline Line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-blue via-accent-green to-primary-blue transform -translate-x-1/2" />

          {/* Steps */}
          <div className="space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`flex items-center gap-8 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } flex-col`}
              >
                {/* Content */}
                <motion.div
                  className="flex-1 bg-white p-10 rounded-professional cursor-pointer shadow-professional border border-light-gray"
                  whileHover={{
                    scale: 1.05,
                    y: -5,
                    transition: { duration: 0.2 },
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-2xl font-bold mb-4 text-dark-navy font-display">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    {step.description}
                  </p>
                </motion.div>

                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-24 h-24 rounded-professional bg-primary-blue flex items-center justify-center shadow-professional relative z-10"
                >
                  <step.icon className="w-12 h-12 text-white" />
                </motion.div>

                {/* Spacer for alignment */}
                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
