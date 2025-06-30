import { Navigation, Footer } from "@/components/landing";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-jules-dark flex flex-col">
      <Navigation />
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
        <CheckCircle className="w-24 h-24 text-green-500 mb-8" />
        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
          GitHub App Linked Successfully!
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto text-jules-gray">
          Thank you for installing and authorizing the Jules Task Queue GitHub App.
          Your repositories can now be processed.
        </p>
        <Link href="/" passHref>
          <Button
            size="lg"
            className="bg-jules-primary text-white hover:bg-jules-primary/90"
          >
            Go to Homepage
          </Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}
