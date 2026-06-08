"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-28 px-6 bg-white relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[hsl(82,55%,88%)] opacity-35 blur-[100px] animate-drift" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[hsl(122,45%,85%)] opacity-25 blur-[80px] animate-drift-slow" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 flex justify-center"
        >
          <div className="relative animate-float">
            <div className="absolute inset-0 rounded-[28%] bg-[hsl(82,55%,65%)] opacity-35 blur-2xl scale-125" />
            <Image
              src="/app-icon.png"
              alt="Linen"
              width={80}
              height={80}
              className="relative rounded-[28%] shadow-xl shadow-[hsl(82,40%,30%)/0.25]"
            />
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="font-display text-[clamp(2.5rem,6vw,5rem)] text-[hsl(82,25%,12%)] mb-5 leading-tight"
        >
          Start dressing with
          <br />
          <span className="text-gradient-light italic">intention today.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="text-[hsl(82,12%,44%)] text-lg max-w-md mx-auto mb-10"
        >
          Join thousands of people who've simplified their wardrobe and rediscovered their style.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <motion.a
            href="#features"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-2 rounded-full bg-[hsl(82,50%,28%)] text-[hsl(82,30%,96%)] px-8 py-4 text-base font-medium shadow-xl shadow-[hsl(82,50%,28%)/0.3] transition-shadow hover:shadow-2xl hover:shadow-[hsl(82,50%,28%)/0.4]"
          >
            Get Linen free
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </motion.a>
        </motion.div>

        {/* Decorative dots */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="mt-16 flex justify-center gap-2"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: `hsl(82, ${30 + i * 8}%, ${55 + i * 5}%)`,
                opacity: 0.4 + i * 0.12,
              }}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
