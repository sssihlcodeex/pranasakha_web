import { motion } from "motion/react";
import { AlertCircle, HeartHandshake, QrCode } from "lucide-react";
import { WhySectionBg } from "@/components/site/SectionBackground";
const cards = [
  {
    icon: AlertCircle,
    title: "The Problem",
    body: "Fragmented email threads, physical paperwork and no single system for volunteer doctors to onboard.",
  },
  {
    icon: HeartHandshake,
    title: "The Mission",
    body: "Love All, Serve All — frictionless Seva for every doctor who wants to serve, wherever they are.",
  },
  {
    icon: QrCode,
    title: "The Platform",
    body: "One account, one role-based view, one QR pass carrying a doctor's entire service history.",
  },
];
export function WhyPranasakha() {
  return (
    <section id="why" className="relative overflow-hidden py-24">
      <WhySectionBg />

      <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.3 }}
          className="text-headline-medium text-on-surface"
        >
          Why This Exists
        </motion.h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {cards.map((card, i) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="m3-card-elevated p-7"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <card.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-title-medium text-on-surface">
                {card.title}
              </h3>
              <p className="mt-2 text-body-large text-on-surface-variant">
                {card.body}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
