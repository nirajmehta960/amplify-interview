import { motion } from "framer-motion";
import { Github, Linkedin, Twitter } from "lucide-react";

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

  const socialLinks = [
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Twitter, href: "#", label: "Twitter" },
  ];

  return (
    <footer className="relative bg-gradient-to-br from-dark-navy to-dark-navy/95 text-white py-20">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
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
            <p className="text-white/70 mb-6 leading-relaxed text-lg">
              Amplify your interview performance with AI-powered practice
              sessions, personalized feedback, and real-time coaching.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-12 h-12 rounded-professional bg-white/10 hover:bg-primary-blue/20 flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5 text-white" />
                </motion.a>
              ))}
            </div>
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
        <div className="border-t border-white/20 pt-8 text-center text-white/70 text-sm">
          <p>© 2024 AI Interview Master. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
