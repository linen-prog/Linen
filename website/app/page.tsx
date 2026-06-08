"use client";

import { NavBar } from "@/components/linen/NavBar";
import { HeroSection } from "@/components/linen/HeroSection";
import { WardrobeDemo } from "@/components/linen/WardrobeDemo";
import { FeaturesSection } from "@/components/linen/FeaturesSection";
import { OutfitOrbit } from "@/components/linen/OutfitOrbit";
import { PhilosophySection } from "@/components/linen/PhilosophySection";
import { CtaSection } from "@/components/linen/CtaSection";
import { FooterSection } from "@/components/linen/FooterSection";

export default function Home() {
  return (
    <main className="min-h-screen">
      <NavBar />
      <HeroSection />
      <WardrobeDemo />
      <FeaturesSection />
      <OutfitOrbit />
      <PhilosophySection />
      <CtaSection />
      <FooterSection />
    </main>
  );
}
