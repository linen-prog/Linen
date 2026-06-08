"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Check, Plus, Shirt, Tag, Layers, Repeat } from "lucide-react";

const CLOTHES = [
  { id: 1, label: "Linen Blazer", color: "#c8b89a", category: "Outerwear", tags: ["work", "smart"] },
  { id: 2, label: "White Oxford", color: "#f0ede8", category: "Tops", tags: ["classic", "work"] },
  { id: 3, label: "Olive Chinos", color: "#8a9068", category: "Bottoms", tags: ["casual", "versatile"] },
  { id: 4, label: "Navy Tee", color: "#3d4f6b", category: "Tops", tags: ["casual", "everyday"] },
  { id: 5, label: "Cream Knit", color: "#e8dfc8", category: "Tops", tags: ["cozy", "weekend"] },
  { id: 6, label: "Black Trousers", color: "#2a2a2a", category: "Bottoms", tags: ["work", "evening"] },
];

const OUTFITS = [
  { name: "Office Ready", items: [1, 2, 3] },
  { name: "Weekend Ease", items: [5, 4, 3] },
  { name: "Evening Out", items: [1, 2, 6] },
];

type Phase = "catalog" | "tag" | "outfit" | "done";

export function WardrobeDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [phase, setPhase] = useState<Phase>("catalog");
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [taggedItem, setTaggedItem] = useState<number | null>(null);
  const [activeOutfit, setActiveOutfit] = useState(0);
  const [outfitCycle, setOutfitCycle] = useState(0);

  useEffect(() => {
    if (!inView) return;

    // Phase 1: catalog items appear one by one
    const timers: ReturnType<typeof setTimeout>[] = [];
    CLOTHES.forEach((c, i) => {
      timers.push(setTimeout(() => {
        setVisibleItems(prev => [...prev, c.id]);
      }, 300 + i * 220));
    });

    // Phase 2: tag
    timers.push(setTimeout(() => setPhase("tag"), 300 + CLOTHES.length * 220 + 400));
    timers.push(setTimeout(() => setTaggedItem(2), 300 + CLOTHES.length * 220 + 900));

    // Phase 3: outfit
    timers.push(setTimeout(() => { setPhase("outfit"); setTaggedItem(null); }, 300 + CLOTHES.length * 220 + 2200));

    // Cycle outfits
    [0, 1, 2].forEach((i) => {
      timers.push(setTimeout(() => {
        setActiveOutfit(i);
        setOutfitCycle(i);
      }, 300 + CLOTHES.length * 220 + 2800 + i * 1400));
    });

    timers.push(setTimeout(() => setPhase("done"), 300 + CLOTHES.length * 220 + 2800 + 3 * 1400));

    return () => timers.forEach(clearTimeout);
  }, [inView]);

  const currentOutfit = OUTFITS[activeOutfit];

  return (
    <section className="py-28 px-6 bg-[hsl(82,18%,95%)] linen-texture overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="badge-brand inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium mb-5">
            <Layers className="w-3.5 h-3.5" />
            See it in action
          </span>
          <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] text-[hsl(82,25%,12%)] mb-4">
            From closet to curated
          </h2>
          <p className="text-[hsl(82,12%,44%)] text-lg max-w-md mx-auto">
            Watch Linen catalog your wardrobe, tag your pieces, and build outfits — live.
          </p>
        </motion.div>

        <div ref={ref} className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: phone mockup */}
          <div className="flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Phone shell */}
              <div className="relative w-[280px] h-[560px] rounded-[44px] bg-[hsl(82,20%,14%)] shadow-2xl shadow-[hsl(82,30%,20%)/0.4] overflow-hidden border-4 border-[hsl(82,15%,22%)]">
                {/* Status bar */}
                <div className="absolute top-0 left-0 right-0 h-10 bg-[hsl(82,20%,14%)] flex items-center justify-between px-6 z-20">
                  <span className="text-[hsl(82,20%,75%)] text-[10px] font-medium">9:41</span>
                  <div className="w-20 h-5 rounded-full bg-[hsl(82,20%,10%)]" />
                  <div className="flex gap-1">
                    <div className="w-3 h-2 rounded-sm bg-[hsl(82,20%,75%)]" />
                  </div>
                </div>

                {/* Screen content */}
                <div className="absolute inset-0 top-10 bg-[hsl(82,22%,97%)] overflow-hidden">
                  {/* App header */}
                  <div className="px-5 pt-4 pb-3 border-b border-[hsl(82,18%,88%)]">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xl text-[hsl(82,25%,15%)]">My Wardrobe</span>
                      <motion.div
                        animate={phase === "catalog" ? { rotate: [0, 90, 0] } : {}}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-7 h-7 rounded-full bg-[hsl(82,45%,88%)] flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5 text-[hsl(82,45%,30%)]" />
                      </motion.div>
                    </div>
                    <p className="text-[10px] text-[hsl(82,12%,55%)] mt-0.5">{visibleItems.length} items cataloged</p>
                  </div>

                  {/* Grid of clothes */}
                  <div className="p-3 grid grid-cols-3 gap-2 overflow-hidden">
                    {CLOTHES.map((item) => (
                      <AnimatePresence key={item.id}>
                        {visibleItems.includes(item.id) && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{
                              opacity: 1,
                              scale: taggedItem === item.id ? 1.08 : 1,
                              boxShadow: taggedItem === item.id
                                ? "0 0 0 2px hsl(82,55%,45%)"
                                : "none",
                            }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="relative aspect-square rounded-xl overflow-hidden"
                            style={{ backgroundColor: item.color }}
                          >
                            {/* Cloth texture */}
                            <div className="absolute inset-0 opacity-20"
                              style={{
                                backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 8px)"
                              }}
                            />
                            {/* Item label */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/20 backdrop-blur-sm px-1.5 py-1">
                              <p className="text-white text-[7px] font-medium truncate">{item.label}</p>
                            </div>
                            {/* Tag indicator */}
                            {taggedItem === item.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[hsl(82,55%,45%)] flex items-center justify-center"
                              >
                                <Tag className="w-2 h-2 text-white" />
                              </motion.div>
                            )}
                            {/* Outfit highlight */}
                            {phase === "outfit" && currentOutfit.items.includes(item.id) && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 ring-2 ring-[hsl(82,55%,45%)] rounded-xl"
                              />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>

                  {/* Outfit panel */}
                  <AnimatePresence>
                    {phase === "outfit" && (
                      <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md rounded-t-3xl shadow-2xl p-4 border-t border-[hsl(82,18%,88%)]"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-semibold text-[hsl(82,25%,20%)] uppercase tracking-wider">Today's Outfit</span>
                          <motion.div
                            key={outfitCycle}
                            initial={{ rotate: 0 }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Repeat className="w-3.5 h-3.5 text-[hsl(82,40%,50%)]" />
                          </motion.div>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={activeOutfit}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.35 }}
                          >
                            <p className="font-display text-base text-[hsl(82,25%,15%)] mb-2">{currentOutfit.name}</p>
                            <div className="flex gap-1.5">
                              {currentOutfit.items.map((id) => {
                                const item = CLOTHES.find(c => c.id === id)!;
                                return (
                                  <div
                                    key={id}
                                    className="w-8 h-8 rounded-lg"
                                    style={{ backgroundColor: item.color }}
                                  />
                                );
                              })}
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Done state */}
                  <AnimatePresence>
                    {phase === "done" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2"
                      >
                        <div className="w-12 h-12 rounded-full bg-[hsl(82,55%,45%)] flex items-center justify-center shadow-lg">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-[11px] font-semibold text-[hsl(82,25%,20%)]">Wardrobe complete!</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Glow under phone */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-12 bg-[hsl(82,50%,60%)] opacity-25 blur-2xl rounded-full" />
            </motion.div>
          </div>

          {/* Right: step list */}
          <div className="space-y-6">
            {[
              {
                icon: Shirt,
                phase: "catalog" as Phase,
                title: "Catalog every piece",
                desc: "Snap a photo or type it in. Linen organizes your clothes by category, color, and season automatically.",
              },
              {
                icon: Tag,
                phase: "tag" as Phase,
                title: "Tag and filter",
                desc: "Add custom tags — work, weekend, travel. Find exactly what you need in seconds, not minutes.",
              },
              {
                icon: Layers,
                phase: "outfit" as Phase,
                title: "Build outfits",
                desc: "Mix and match pieces into saved outfits. Plan your week in advance and never repeat an outfit accidentally.",
              },
            ].map((step, i) => {
              const isActive = phase === step.phase || (phase === "done" && i === 2);
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
                  className={`flex gap-5 p-5 rounded-2xl transition-all duration-500 ${
                    isActive
                      ? "bg-white shadow-lg shadow-[hsl(82,30%,50%)/0.12] border border-[hsl(82,30%,88%)]"
                      : "bg-transparent"
                  }`}
                >
                  <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-500 ${
                    isActive ? "bg-[hsl(82,50%,28%)]" : "bg-[hsl(82,20%,88%)]"
                  }`}>
                    <step.icon className={`w-5 h-5 transition-colors duration-500 ${isActive ? "text-white" : "text-[hsl(82,20%,55%)]"}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-base mb-1 transition-colors duration-500 ${isActive ? "text-[hsl(82,25%,12%)]" : "text-[hsl(82,15%,45%)]"}`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm leading-relaxed transition-colors duration-500 ${isActive ? "text-[hsl(82,12%,40%)]" : "text-[hsl(82,10%,60%)]"}`}>
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
