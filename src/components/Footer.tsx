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
    <footer className="relative bg-gradient-to-br from-foreground to-foreground/95 text-background py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl font-bold mb-4 text-background"
            >
              AI Interview Master
            </motion.div>
            <p className="text-background/70 mb-6 leading-relaxed">
              Empowering professionals worldwide to ace their interviews with
              AI-powered coaching and feedback.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 rounded-full bg-background/10 hover:bg-background/20 flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5 text-background" />
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
              <h3 className="font-semibold mb-4 text-background">
                {column.title}
              </h3>
              <ul className="space-y-2">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href="#"
                      className="text-background/70 hover:text-background transition-colors"
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
        <div className="border-t border-background/20 pt-8 text-center text-background/70 text-sm">
          <p>© 2024 AI Interview Master. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
