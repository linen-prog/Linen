"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export function NavBar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => {
    setScrolled(v > 40);
  });

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/85 backdrop-blur-xl border-b border-[hsl(82,18%,88%)] shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: 5, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <Image
              src="/app-icon.png"
              alt="Linen"
              width={32}
              height={32}
              className="rounded-[30%]"
            />
          </motion.div>
          <span className="font-display text-xl text-[hsl(82,25%,15%)]">Linen</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Features", href: "#features" },
            { label: "Privacy", href: "/privacy" },
            { label: "Support", href: "/support" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-[hsl(82,12%,42%)] hover:text-[hsl(82,25%,15%)] transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <motion.a
          href="#features"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-full bg-[hsl(82,50%,28%)] text-[hsl(82,30%,96%)] px-5 py-2 text-sm font-medium shadow-md shadow-[hsl(82,50%,28%)/0.2] transition-shadow hover:shadow-lg"
        >
          Get the app
        </motion.a>
      </div>
    </motion.header>
  );
}
