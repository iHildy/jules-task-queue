import {
  CTASection,
  FeaturesSection,
  Footer,
  HeroSection,
  HowItWorks,
  Navigation,
  ProblemSection,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="min-h-screen bg-jules-dark">
      <Navigation />
      <HeroSection />
      <ProblemSection />
      <HowItWorks />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
}
