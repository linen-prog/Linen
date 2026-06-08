"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { NewlyAttribution } from "@/components/ui/newly-attribution";
import { ArrowLeft, Mail, MessageCircle, BookOpen, Shirt } from "lucide-react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
});

const FAQ = [
  {
    q: "How do I add a clothing item?",
    a: "Tap the + button in the top right of your wardrobe. You can take a photo, choose from your library, or enter details manually. Linen will suggest a category based on what you enter.",
  },
  {
    q: "Can I back up my wardrobe?",
    a: "Your wardrobe is stored on your device. You can export your data from Settings > Export Wardrobe to create a backup file you can import later.",
  },
  {
    q: "How do I create an outfit?",
    a: "Go to the Outfits tab and tap New Outfit. Select pieces from your wardrobe to combine them. You can name the outfit and save it for future use.",
  },
  {
    q: "Does Linen require an internet connection?",
    a: "No. Linen works entirely offline. All your data is stored on your device and the app functions without any internet connection.",
  },
  {
    q: "How do I delete a clothing item?",
    a: "Open the item, tap the three-dot menu in the top right, and select Delete. This action cannot be undone.",
  },
  {
    q: "Can I use Linen on multiple devices?",
    a: "Currently, Linen is a single-device app. Your wardrobe lives on the device where you installed it. Multi-device sync is on our roadmap.",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[hsl(82,22%,97%)] linen-texture">
      {/* Header */}
      <header className="border-b border-[hsl(82,18%,88%)] bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-[hsl(82,12%,44%)] hover:text-[hsl(82,25%,20%)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Linen
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/app-icon.png" alt="Linen" width={28} height={28} className="rounded-[30%]" />
            <span className="font-display text-lg text-[hsl(82,25%,15%)]">Linen</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <motion.div {...fadeUp(0)} className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(82,45%,88%)] flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-[hsl(82,50%,30%)]" />
            </div>
          </div>
          <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] text-[hsl(82,25%,12%)] mb-4">
            Support
          </h1>
          <p className="text-[hsl(82,12%,44%)] text-lg max-w-md mx-auto">
            We're here to help. Browse the FAQ below or reach out directly.
          </p>
        </motion.div>

        {/* Contact card */}
        <motion.div
          {...fadeUp(0.1)}
          className="bg-white rounded-3xl border border-[hsl(82,18%,88%)] p-8 mb-12 shadow-sm"
        >
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(82,50%,28%)] flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[hsl(82,25%,15%)] text-lg mb-1">Email support</h2>
              <p className="text-[hsl(82,12%,44%)] text-sm mb-4 leading-relaxed">
                Have a question, found a bug, or want to share feedback? We read every message and typically respond within 1–2 business days.
              </p>
              <a
                href="mailto:support@linen.app"
                className="inline-flex items-center gap-2 rounded-full bg-[hsl(82,50%,28%)] text-[hsl(82,30%,96%)] px-5 py-2.5 text-sm font-medium hover:bg-[hsl(82,50%,24%)] transition-colors"
              >
                <Mail className="w-4 h-4" />
                support@linen.app
              </a>
            </div>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div {...fadeUp(0.2)}>
          <div className="flex items-center gap-3 mb-8">
            <BookOpen className="w-5 h-5 text-[hsl(82,40%,45%)]" />
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)]">Frequently asked questions</h2>
          </div>

          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-[hsl(82,18%,88%)] p-6"
              >
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-lg bg-[hsl(82,45%,88%)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shirt className="w-3.5 h-3.5 text-[hsl(82,50%,30%)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[hsl(82,25%,15%)] mb-2">{item.q}</h3>
                    <p className="text-[hsl(82,12%,44%)] text-sm leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Legal links */}
        <motion.div
          {...fadeUp(0.3)}
          className="mt-16 pt-8 border-t border-[hsl(82,18%,88%)] flex flex-wrap gap-6 text-sm text-[hsl(82,12%,50%)]"
        >
          <Link href="/privacy" className="hover:text-[hsl(82,25%,20%)] transition-colors">Privacy Policy</Link>
          <Link href="/privacy#terms" className="hover:text-[hsl(82,25%,20%)] transition-colors">Terms of Service</Link>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[hsl(82,18%,88%)] py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[hsl(82,10%,55%)]">&copy; {new Date().getFullYear()} Linen. All rights reserved.</p>
          <NewlyAttribution />
        </div>
      </footer>
    </div>
  );
}
