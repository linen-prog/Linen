"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Signature animated component: orbiting clothing swatches around a central outfit
const ORBIT_ITEMS = [
  { label: "Blazer", color: "#c8b89a", angle: 0, r: 130 },
  { label: "Oxford", color: "#f0ede8", angle: 60, r: 130 },
  { label: "Chinos", color: "#8a9068", angle: 120, r: 130 },
  { label: "Tee", color: "#3d4f6b", angle: 180, r: 130 },
  { label: "Knit", color: "#e8dfc8", angle: 240, r: 130 },
  { label: "Trousers", color: "#2a2a2a", angle: 300, r: 130 },
];

const INNER_ITEMS = [
  { label: "Scarf", color: "#d4a574", angle: 30, r: 72 },
  { label: "Belt", color: "#6b4c3b", angle: 150, r: 72 },
  { label: "Watch", color: "#c0a882", angle: 270, r: 72 },
];

function toXY(angle: number, r: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

export function OutfitOrbit() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-28 px-6 bg-[hsl(82,22%,96%)] linen-texture overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="badge-brand inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              Outfit intelligence
            </span>
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] text-[hsl(82,25%,12%)] mb-6 leading-tight">
              Your whole wardrobe,
              <br />
              <span className="text-gradient-light italic">in orbit.</span>
            </h2>
            <p className="text-[hsl(82,12%,42%)] text-lg leading-relaxed mb-8 max-w-md">
              Linen maps every piece in your closet and shows you how they connect.
              Discover combinations you never thought of — and retire the ones you never wear.
            </p>
            <ul className="space-y-3">
              {[
                "Visualize your entire wardrobe at a glance",
                "See outfit combinations as a living map",
                "Identify underused pieces instantly",
              ].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 text-[hsl(82,15%,30%)] text-sm"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[hsl(82,50%,40%)] flex-shrink-0" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right: orbit diagram */}
          <div ref={ref} className="flex justify-center">
            <div className="relative w-[320px] h-[320px]">
              {/* Orbit rings */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border border-dashed border-[hsl(82,30%,72%)] opacity-60" />
                {/* Inner ring */}
                <div className="absolute inset-[58px] rounded-full border border-dashed border-[hsl(82,30%,72%)] opacity-40" />
              </motion.div>

              {/* Outer orbit items */}
              <motion.div
                animate={inView ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                {ORBIT_ITEMS.map((item, i) => {
                  const { x, y } = toXY(item.angle, item.r);
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={inView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      }}
                    >
                      {/* Counter-rotate so labels stay upright */}
                      <motion.div
                        animate={inView ? { rotate: -360 } : { rotate: 0 }}
                        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-10 h-10 rounded-xl shadow-md border-2 border-white/80"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[9px] font-medium text-[hsl(82,20%,40%)] whitespace-nowrap">
                          {item.label}
                        </span>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Inner orbit items */}
              <motion.div
                animate={inView ? { rotate: -360 } : { rotate: 0 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                {INNER_ITEMS.map((item, i) => {
                  const { x, y } = toXY(item.angle, item.r);
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={inView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.5, delay: 0.6 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      }}
                    >
                      <motion.div
                        animate={inView ? { rotate: 360 } : { rotate: 0 }}
                        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-7 h-7 rounded-lg shadow-sm border border-white/70"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[8px] font-medium text-[hsl(82,20%,50%)] whitespace-nowrap">
                          {item.label}
                        </span>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Center: outfit core */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[hsl(82,55%,65%)] opacity-30 blur-xl scale-150" />
                  <div className="relative w-16 h-16 rounded-full bg-[hsl(82,50%,28%)] shadow-xl flex items-center justify-center">
                    <span className="font-display text-white text-xs text-center leading-tight">Today</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
