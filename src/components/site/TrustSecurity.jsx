import { motion } from "motion/react";
import { Lock, ScrollText, Landmark } from "lucide-react";
import { TrustSecuritySectionBg } from "@/components/site/SectionBackground";
const badges = [
  {
    icon: Lock,
    title: "AES-256 Encryption",
    desc: "Bank-grade encryption at rest and in transit.",
  },
  {
    icon: ScrollText,
    title: "DPDP · GDPR · HIPAA",
    desc: "Aligned with India's DPDP Act 2023 and global norms.",
  },
  {
    icon: Landmark,
    title: "Trust Oversight",
    desc: "Governed by the Sri Sathya Sai Central Trust.",
  },
];
export function TrustSecurity() {
  return (
    <section className="relative overflow-hidden py-24">
      <TrustSecuritySectionBg />

      <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.3 }}
          className="m3-card-elevated p-8 sm:p-12"
        >
          <h2 className="text-headline-medium text-on-surface">
            Trust & Security
          </h2>
          <p className="mt-4 max-w-3xl text-body-large text-on-surface-variant">
            Every credential, passport scan and service record is protected with
            bank-grade AES-256 encryption, handled in alignment with India's
            DPDP Act 2023, GDPR and HIPAA, and held under the oversight of the
            Sri Sathya Sai Central Trust.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.25, delay: i * 0.08 }}
                className="rounded-2xl bg-primary-container/60 p-5"
              >
                <badge.icon className="h-5 w-5 text-on-primary-container" />
                <h3 className="mt-3 text-title-medium text-on-surface">
                  {badge.title}
                </h3>
                <p className="mt-1 text-body-large text-on-surface-variant">
                  {badge.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
