import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Sign In", href: "/auth/signin" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-sm shadow-professional border-b border-light-gray"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-2xl font-bold text-dark-navy font-display"
          >
            Amplify Interview
          </motion.div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {menuItems.map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                whileHover={{ scale: 1.05 }}
                className="text-dark-navy/80 hover:text-primary-blue transition-colors font-medium"
                onClick={(e) => {
                  if (item.href.startsWith("/")) {
                    e.preventDefault();
                    window.location.href = item.href;
                  }
                }}
              >
                {item.label}
              </motion.a>
            ))}
            <Button
              onClick={() => (window.location.href = "/auth/signup")}
              className="bg-primary-blue hover:bg-primary-blue/90 text-white shadow-professional rounded-professional px-6 py-2 font-medium"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 pb-4"
            >
              {menuItems.map((item, index) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="block py-3 text-dark-navy/80 hover:text-primary-blue transition-colors font-medium"
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    if (item.href.startsWith("/")) {
                      e.preventDefault();
                      window.location.href = item.href;
                    }
                  }}
                >
                  {item.label}
                </motion.a>
              ))}
              <Button
                onClick={() => (window.location.href = "/auth/signup")}
                className="w-full mt-4 bg-primary-blue hover:bg-primary-blue/90 text-white rounded-professional"
              >
                Get Started
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
