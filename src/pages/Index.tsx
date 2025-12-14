import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Amplify Interview - AI-Powered Mock Interview Platform</title>
        <meta name="description" content="Master your interviews with AI-powered coaching. Practice with video recording, get detailed AI analysis, and track your progress with comprehensive analytics." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
