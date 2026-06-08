"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";

const STAGGER = 0.12;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1], delay },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 1.1, ease: "easeOut", delay },
});

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const blobY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden bg-[hsl(82,22%,97%)] linen-texture"
    >
      {/* Atmospheric blobs */}
      <motion.div
        style={{ y: blobY }}
        className="pointer-events-none absolute inset-0 z-0"
      >
        <div className="absolute top-[-10%] left-[-5%] w-[55vw] h-[55vw] rounded-full bg-[hsl(82,60%,82%)] opacity-40 blur-[90px] animate-drift" />
        <div className="absolute bottom-[-8%] right-[-8%] w-[45vw] h-[45vw] rounded-full bg-[hsl(122,45%,80%)] opacity-30 blur-[80px] animate-drift-slow" />
        <div className="absolute top-[30%] right-[10%] w-[28vw] h-[28vw] rounded-full bg-[hsl(60,70%,85%)] opacity-25 blur-[60px] animate-drift" style={{ animationDelay: "-9s" }} />
      </motion.div>

      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-grid opacity-40" />

      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto"
      >
        {/* Eyebrow */}
        <motion.div {...fadeIn(0.1)} className="mb-8">
          <span className="badge-brand inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Your wardrobe, reimagined
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.2)}
          className="font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.95] text-[hsl(82,25%,12%)] mb-6"
        >
          Dress with
          <br />
          <span className="text-gradient-light italic">intention.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          {...fadeUp(0.2 + STAGGER)}
          className="text-[clamp(1rem,2vw,1.25rem)] text-[hsl(82,12%,42%)] max-w-xl leading-relaxed mb-10"
        >
          Linen turns your closet into a curated collection. Catalog every piece,
          build outfits you love, and finally stop buying things you already own.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.2 + STAGGER * 2)}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <motion.a
            href="#features"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-2 rounded-full bg-[hsl(82,50%,28%)] text-[hsl(82,30%,96%)] px-7 py-3.5 text-base font-medium shadow-lg shadow-[hsl(82,50%,28%)/0.25] transition-shadow hover:shadow-xl hover:shadow-[hsl(82,50%,28%)/0.35]"
          >
            Explore the app
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </motion.a>
          <motion.a
            href="/support"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(82,25%,75%)] bg-white/60 backdrop-blur-sm text-[hsl(82,25%,25%)] px-7 py-3.5 text-base font-medium transition-colors hover:bg-white/90"
          >
            Learn more
          </motion.a>
        </motion.div>

        {/* App icon float */}
        <motion.div
          {...fadeIn(0.2 + STAGGER * 3)}
          className="mt-16 animate-float"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-[28%] bg-[hsl(82,55%,65%)] opacity-30 blur-2xl scale-110" />
            <Image
              src="/app-icon.png"
              alt="Linen app icon"
              width={96}
              height={96}
              className="relative rounded-[28%] shadow-2xl shadow-[hsl(82,40%,30%)/0.3]"
              priority
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        {...fadeIn(1.4)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-5 h-8 rounded-full border-2 border-[hsl(82,25%,60%)] flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-1.5 rounded-full bg-[hsl(82,40%,50%)]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
