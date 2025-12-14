import { motion } from "framer-motion";
import { Settings, BookOpen, Video, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: Settings,
    title: "Set Up Interview",
    description: "Choose your interview type (Behavioral, Technical, Leadership, or Custom), select questions from our database or your personal bank, and configure duration.",
    position: "left"
  },
  {
    icon: BookOpen,
    title: "Create Questions",
    description: "Build your personal question bank with custom questions, categorize them by domain (PM, Engineer, Data Scientist, etc.), and manage your practice library.",
    position: "right"
  },
  {
    icon: Video,
    title: "Record & Practice",
    description: "Record your interview responses with video, get real-time transcription, and practice with industry-specific questions tailored to your role.",
    position: "left"
  },
  {
    icon: BarChart3,
    title: "Analyze & Improve",
    description: "Get detailed AI analysis with scores, feedback, and improvement suggestions. Track your progress with comprehensive analytics and performance insights.",
    position: "right"
  }
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold mb-4 sm:mb-6 px-4 sm:px-0">
            How It{" "}
            <span className="gradient-text">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From setup to analysis, master your interview skills with our comprehensive platform
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto relative">
          {/* Vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/30 to-transparent hidden md:block" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative flex items-center gap-8 mb-12 last:mb-0 ${
                step.position === "right" ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Content card */}
              <div className={`flex-1 glass-card p-6 ${step.position === "right" ? "md:text-right" : ""}`}>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Icon bubble - center on desktop */}
              <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center shadow-lg shadow-primary/20">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
              </div>

              {/* Mobile icon */}
              <div className="md:hidden shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
              </div>

              {/* Empty space for alignment */}
              <div className="flex-1 hidden md:block" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


