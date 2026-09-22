import { createFileRoute } from "@tanstack/react-router";
import { NavBar } from "@/components/site/NavBar";
import { Hero } from "@/components/site/Hero";
import { WhyPranasakha } from "@/components/site/WhyPranasakha";
import { Institutions } from "@/components/site/Institutions";
import { HowItWorks } from "@/components/site/HowItWorks";
import { WhoCanJoin } from "@/components/site/WhoCanJoin";
import { WhatHappensNext } from "@/components/site/WhatHappensNext";
import { TrustSecurity } from "@/components/site/TrustSecurity";
import { Footer } from "@/components/site/Footer";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRANASAKHA — Volunteer Doctor Onboarding for Sai Hospitals" },
      {
        name: "description",
        content:
          "PRANASAKHA connects volunteer doctors worldwide with Sri Sathya Sai Medical Institutions. One account, one verification, one digital Sai Medical Pass.",
      },
      { property: "og:title", content: "PRANASAKHA — Love All, Serve All" },
      {
        property: "og:description",
        content:
          "Onboard as a volunteer doctor with Sri Sathya Sai Medical Institutions — verification, roster and digital pass in one platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
function Index() {
  return (
    <div className="min-h-screen bg-surface">
      <NavBar overlay />
      <main>
        <Hero />
        <WhyPranasakha />
        <Institutions />
        <HowItWorks />
        <WhoCanJoin />
        <WhatHappensNext />
        <TrustSecurity />
      </main>
      <Footer />
    </div>
  );
}
