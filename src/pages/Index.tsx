import { Helmet } from "react-helmet-async";
import { ClosingCta } from "@/components/landing/closing-cta";
import { META } from "@/components/landing/content";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { LandingHero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SampleFeedback } from "@/components/landing/sample-feedback";
import { LandingShell } from "@/components/landing/shell";

/**
 * The landing page: six bands in the reference's band system.
 * Spec: docs/superpowers/specs/2026-10-05-ui-redesign-foundation-landing-design.md §4.
 * The hero's white foot meets the white features band, so no seam treatment
 * belongs between them.
 */
const Index = () => (
  <>
    <Helmet>
      <title>{META.title}</title>
      <meta name="description" content={META.description} />
    </Helmet>
    <LandingShell>
      <LandingHero />
      <Features />
      <SampleFeedback />
      <HowItWorks />
      <Faq />
      <ClosingCta />
    </LandingShell>
  </>
);

export default Index;
