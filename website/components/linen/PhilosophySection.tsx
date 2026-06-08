"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const PRINCIPLES = [
  {
    number: "01",
    title: "Less, but better",
    body: "A smaller wardrobe of pieces you love beats a packed closet of things you tolerate. Linen helps you see what you actually wear.",
  },
  {
    number: "02",
    title: "Intentional buying",
    body: "Before you add something new, check what you already own. Linen shows you gaps — not excuses to shop more.",
  },
  {
    number: "03",
    title: "Your style, your data",
    body: "No accounts, no cloud sync, no ads. Your wardrobe data lives on your device and nowhere else.",
  },
];

export function PhilosophySection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.8], ["0%", "100%"]);

  return (
    <section ref={ref} className="py-28 px-6 bg-[hsl(82,25%,12%)] overflow-hidden relative">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, hsl(82,40%,80%) 0px, hsl(82,40%,80%) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, hsl(82,40%,80%) 0px, hsl(82,40%,80%) 1px, transparent 1px, transparent 40px)"
        }}
      />

      {/* Ambient blobs */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full bg-[hsl(82,50%,40%)] opacity-10 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] rounded-full bg-[hsl(122,40%,50%)] opacity-8 blur-[80px]" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium mb-6 bg-[hsl(82,30%,22%)] text-[hsl(82,40%,72%)] border border-[hsl(82,25%,28%)]">
            Our philosophy
          </span>
          <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] text-[hsl(82,20%,92%)] max-w-2xl leading-tight">
            A wardrobe that works
            <br />
            <span className="italic text-[hsl(82,45%,68%)]">for you.</span>
          </h2>
        </motion.div>

        {/* Principles with animated line */}
        <div className="relative">
          {/* Animated vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[hsl(82,25%,22%)]">
            <motion.div
              style={{ height: lineHeight }}
              className="w-full bg-[hsl(82,45%,55%)]"
            />
          </div>

          <div className="space-y-14">
            {PRINCIPLES.map((p, i) => (
              <motion.div
                key={p.number}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                className="flex gap-10 pl-12 relative"
              >
                {/* Dot on line */}
                <div className="absolute left-[13px] top-1 w-3 h-3 rounded-full bg-[hsl(82,45%,55%)] border-2 border-[hsl(82,25%,12%)]" />

                <div className="flex-1">
                  <div className="flex items-baseline gap-4 mb-3">
                    <span className="font-mono text-xs text-[hsl(82,30%,45%)] tracking-widest">{p.number}</span>
                    <h3 className="font-display text-2xl text-[hsl(82,20%,90%)]">{p.title}</h3>
                  </div>
                  <p className="text-[hsl(82,12%,58%)] leading-relaxed max-w-xl">{p.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
