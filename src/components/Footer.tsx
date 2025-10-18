import { motion } from "framer-motion";

const Footer = () => {
  const footerLinks = [
    {
      title: "Product",
      links: ["Features", "How It Works"],
    },
    {
      title: "Company",
      links: ["About", "Contact"],
    },
    {
      title: "Support",
      links: ["Help Center", "Documentation"],
    },
  ];

  return (
    <footer className="relative bg-gradient-to-br from-dark-navy to-dark-navy/95 text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl font-bold mb-4 text-white font-display"
            >
              Amplify Interview
            </motion.div>
            <p className="text-white/70 mb-4 leading-relaxed">
              Amplify your interview performance with AI-powered practice
              sessions, personalized feedback, and real-time coaching.
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((column, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <h3 className="font-semibold mb-4 text-white font-display">
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href="#"
                      className="text-white/70 hover:text-primary-blue transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Copyright */}
        <div className="border-t border-white/20 pt-6 text-center text-white/70 text-sm">
          <p>© 2025 Amplify Interview. All rights reserved.</p>
          <p className="mt-1 text-white/50 text-xs">
            Powered by OpenAI GPT and Anthropic Claude models
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
