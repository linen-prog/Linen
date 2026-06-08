"use client";

import { motion } from "framer-motion";
import {
  Camera,
  Palette,
  CalendarDays,
  ShoppingBag,
  BarChart3,
  CloudOff,
} from "lucide-react";

const FEATURES = [
  {
    icon: Camera,
    title: "Smart cataloging",
    desc: "Photograph your clothes and Linen auto-detects color, category, and fabric type. Your wardrobe, organized in minutes.",
    accent: "hsl(82,55%,88%)",
    iconColor: "hsl(82,50%,30%)",
  },
  {
    icon: Palette,
    title: "Color harmony",
    desc: "See which pieces work together with color-matching suggestions. Build a wardrobe that's cohesive, not chaotic.",
    accent: "hsl(122,45%,88%)",
    iconColor: "hsl(122,45%,28%)",
  },
  {
    icon: CalendarDays,
    title: "Outfit planner",
    desc: "Plan your week's outfits on Sunday. No more morning decision fatigue — just open Linen and get dressed.",
    accent: "hsl(60,60%,88%)",
    iconColor: "hsl(60,55%,28%)",
  },
  {
    icon: ShoppingBag,
    title: "Shop smarter",
    desc: "Before you buy, check if you already own something similar. Linen shows you gaps in your wardrobe, not duplicates.",
    accent: "hsl(40,60%,88%)",
    iconColor: "hsl(40,55%,28%)",
  },
  {
    icon: BarChart3,
    title: "Wear analytics",
    desc: "Discover which pieces you actually wear and which are collecting dust. Make every item earn its place.",
    accent: "hsl(200,50%,88%)",
    iconColor: "hsl(200,50%,28%)",
  },
  {
    icon: CloudOff,
    title: "Fully offline",
    desc: "Your wardrobe data stays on your device. No account required, no subscription, no cloud dependency.",
    accent: "hsl(82,20%,88%)",
    iconColor: "hsl(82,20%,35%)",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-20"
        >
          <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] text-[hsl(82,25%,12%)] mb-4">
            Everything your wardrobe needs
          </h2>
          <p className="text-[hsl(82,12%,44%)] text-lg max-w-lg mx-auto">
            Thoughtfully designed features that make getting dressed feel effortless.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.75,
                ease: [0.22, 1, 0.36, 1],
                delay: (i % 3) * 0.1,
              }}
              whileHover={{ y: -6, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
              className="group relative p-7 rounded-3xl bg-[hsl(82,18%,97%)] border border-[hsl(82,18%,90%)] overflow-hidden cursor-default"
            >
              {/* Hover bg wash */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                style={{ background: `radial-gradient(circle at 30% 30%, ${feat.accent} 0%, transparent 70%)` }}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: feat.accent }}
                >
                  <feat.icon className="w-5.5 h-5.5" style={{ color: feat.iconColor, width: 22, height: 22 }} />
                </div>

                <h3 className="font-semibold text-[hsl(82,25%,12%)] text-lg mb-2">{feat.title}</h3>
                <p className="text-[hsl(82,12%,44%)] text-sm leading-relaxed">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
