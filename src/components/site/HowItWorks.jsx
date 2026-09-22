import { motion } from "motion/react";
import { HowItWorksSectionBg } from "@/components/site/SectionBackground";
const steps = [
  {
    title: "Sign Up & Submit Credentials",
    desc: "Create one account and upload your medical registration once.",
  },
  {
    title: "Directorate Verification",
    desc: "The Directorate reviews and approves your credentials.",
  },
  {
    title: "Roster Assignment",
    desc: "You are matched to a department, institution and service window.",
  },
  {
    title: "Digital Sai Medical Pass Issued",
    desc: "A QR pass carrying your identity and service history.",
  },
];
export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-24">
      <HowItWorksSectionBg />

      <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.3 }}
          className="text-headline-medium text-on-surface"
        >
          From Sign-Up to Seva, in Four Steps
        </motion.h2>

        <div className="relative mt-14">
          {/* progress line */}
          <div className="absolute left-6 top-0 h-full w-px bg-outline/30 md:left-0 md:top-6 md:h-px md:w-full" />
          <motion.div
            initial={{ scaleY: 0, scaleX: 0 }}
            whileInView={{ scaleY: 1, scaleX: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
            className="absolute left-6 top-0 h-full w-px origin-top bg-secondary md:left-0 md:top-6 md:h-px md:w-full md:origin-left"
          />

          <ol className="grid gap-10 md:grid-cols-4 md:gap-6">
            {steps.map((step, i) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className="relative pl-16 md:pl-0 md:pt-16"
              >
                <span className="absolute left-0 top-0 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-title-medium text-primary-foreground shadow-elevation-2">
                  {i + 1}
                </span>
                <h3 className="text-title-medium text-on-surface">
                  {step.title}
                </h3>
                <p className="mt-2 text-body-large text-on-surface-variant">
                  {step.desc}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
