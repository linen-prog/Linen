"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { NewlyAttribution } from "@/components/ui/newly-attribution";

export function FooterSection() {
  return (
    <footer className="bg-[hsl(82,22%,96%)] border-t border-[hsl(82,18%,88%)] linen-texture">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/app-icon.png"
                alt="Linen"
                width={36}
                height={36}
                className="rounded-[30%]"
              />
              <span className="font-display text-xl text-[hsl(82,25%,15%)]">Linen</span>
            </div>
            <p className="text-[hsl(82,12%,44%)] text-sm leading-relaxed max-w-xs">
              A wardrobe app for people who care about what they wear — and what they don't.
            </p>
          </div>

          {/* App */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[hsl(82,15%,40%)] mb-4">App</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Features", href: "#features" },
                { label: "Support", href: "/support" },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-[hsl(82,12%,44%)] hover:text-[hsl(82,25%,20%)] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[hsl(82,15%,40%)] mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/privacy#terms" },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-[hsl(82,12%,44%)] hover:text-[hsl(82,25%,20%)] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="hr-fade mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[hsl(82,10%,55%)]">
            &copy; {new Date().getFullYear()} Linen. All rights reserved.
          </p>
          <NewlyAttribution />
        </div>
      </div>
    </footer>
  );
}
