import {
  CTASection,
  FeaturesSection,
  Footer,
  HeroSection,
  HowItWorks,
  Navigation,
  ProblemSection,
  StatsSection,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="min-h-screen bg-jules-dark">
      <Navigation />
      <HeroSection />
      <ProblemSection />
      <StatsSection />
      <HowItWorks />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
}
