"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { NewlyAttribution } from "@/components/ui/newly-attribution";
import { ArrowLeft } from "lucide-react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
});

export default function PrivacyPage() {
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
        {/* Privacy Policy */}
        <motion.div {...fadeUp(0)}>
          <span className="badge-brand inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            Legal
          </span>
          <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] text-[hsl(82,25%,12%)] mb-3">
            Privacy Policy
          </h1>
          <p className="text-[hsl(82,12%,50%)] text-sm mb-12">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </motion.div>

        <motion.div {...fadeUp(0.1)} className="prose prose-stone max-w-none space-y-8 text-[hsl(82,12%,35%)] leading-relaxed">
          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Overview</h2>
            <p>
              Linen is designed with your privacy as a first principle. The app operates entirely on your device — your wardrobe data, outfit plans, and usage patterns are stored locally and never transmitted to any server.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Information we collect</h2>
            <p>
              <strong>We collect no personal information.</strong> Linen does not require an account, does not collect your name, email address, or any identifying information. The app does not connect to the internet during normal use.
            </p>
            <p className="mt-3">
              All data you enter — clothing items, photos, outfit combinations, tags — is stored exclusively on your device using local storage. This data is never uploaded, synced, or shared.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Photos and camera access</h2>
            <p>
              If you choose to photograph clothing items, those images are stored locally on your device. We do not access, process, or transmit your photos. Camera and photo library permissions are requested only when you initiate a photo action and are used solely for that purpose.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Analytics and tracking</h2>
            <p>
              Linen contains no analytics SDKs, no advertising frameworks, no crash reporters that transmit data off-device, and no third-party tracking of any kind. We do not know how you use the app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Data deletion</h2>
            <p>
              Because all data is stored on your device, you can delete it at any time by clearing the app's data in your device settings or by uninstalling the app. There is no server-side data to request deletion of.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Children's privacy</h2>
            <p>
              Linen does not knowingly collect any information from children under 13. Because we collect no information from any user, this policy applies equally to all users regardless of age.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Changes to this policy</h2>
            <p>
              If we ever change our privacy practices, we will update this page and revise the "last updated" date above. We will not adopt practices that are less protective of your privacy without clear notice.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Contact</h2>
            <p>
              Questions about this privacy policy? Reach us at{" "}
              <a href="/support" className="text-[hsl(82,50%,32%)] underline underline-offset-2 hover:text-[hsl(82,50%,22%)]">
                our support page
              </a>.
            </p>
          </section>
        </motion.div>

        {/* Divider */}
        <div className="hr-fade my-16" />

        {/* Terms of Service */}
        <motion.div
          id="terms"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] text-[hsl(82,25%,12%)] mb-3">
            Terms of Service
          </h1>
          <p className="text-[hsl(82,12%,50%)] text-sm mb-12">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="prose prose-stone max-w-none space-y-8 text-[hsl(82,12%,35%)] leading-relaxed"
        >
          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Acceptance of terms</h2>
            <p>
              By downloading or using Linen, you agree to these Terms of Service. If you do not agree, please do not use the app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Use of the app</h2>
            <p>
              Linen is provided for personal, non-commercial use. You may use the app to catalog your personal wardrobe, plan outfits, and manage your clothing items. You may not reverse-engineer, decompile, or create derivative works from the app.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Your content</h2>
            <p>
              All content you create in Linen — clothing entries, photos, outfit plans — belongs to you. Because this data is stored locally on your device, we have no access to it and make no claims over it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Disclaimer of warranties</h2>
            <p>
              Linen is provided "as is" without warranties of any kind. We do not guarantee that the app will be error-free, uninterrupted, or meet your specific requirements. Use the app at your own risk.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages arising from your use of Linen, including loss of data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Changes to terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-[hsl(82,25%,15%)] mb-3">Contact</h2>
            <p>
              Questions about these terms? Visit{" "}
              <a href="/support" className="text-[hsl(82,50%,32%)] underline underline-offset-2 hover:text-[hsl(82,50%,22%)]">
                our support page
              </a>.
            </p>
          </section>
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
