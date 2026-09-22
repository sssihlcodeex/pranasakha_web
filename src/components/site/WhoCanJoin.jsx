import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Stethoscope,
  HeartPulse,
  Activity,
  FlaskConical,
  ClipboardList,
  MoreHorizontal,
} from "lucide-react";
import { WhoCanJoinSectionBg } from "@/components/site/SectionBackground";
const categories = [
  {
    slug: "doctors",
    icon: Stethoscope,
    title: "Doctors",
    desc: "All specialties welcome — Cardiology, Orthopedics, Neurosurgery, Ophthalmology, General Medicine, and more.",
  },
  {
    slug: "nurses",
    icon: HeartPulse,
    title: "Nurses",
    desc: "Nurse specialists, critical care nurses, OT nurses, and other nursing roles across departments.",
  },
  {
    slug: "physiotherapists",
    icon: Activity,
    title: "Physiotherapists",
    desc: "Rehabilitation and physiotherapy specialists supporting patient recovery and mobility care.",
  },
  {
    slug: "technicians",
    icon: FlaskConical,
    title: "Technicians",
    desc: "Lab technicians, blood bank technicians, radiology technicians, echocardiographers, and more.",
  },
  {
    slug: "assistants",
    icon: ClipboardList,
    title: "Assistants",
    desc: "OP assistants and other support roles that keep clinical operations running smoothly.",
  },
  {
    slug: "others",
    icon: MoreHorizontal,
    title: "Others",
    desc: "Any other healthcare or allied Seva role not listed above — tell us how you'd like to serve.",
  },
];
export function WhoCanJoin() {
  return (
    <section id="who-can-join" className="relative overflow-hidden py-24">
      <WhoCanJoinSectionBg />

      <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.3 }}
          className="text-headline-medium text-on-surface"
        >
          Who Can Join
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mt-3 max-w-2xl text-body-large text-on-surface-variant"
        >
          Choose the category that best describes your role to begin
          registration.
        </motion.p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.25, delay: (i % 3) * 0.07 }}
            >
              <Link
                to="/signup"
                search={{ category: cat.slug }}
                className="m3-card-outlined block h-full p-6 transition-colors hover:border-primary hover:bg-primary-container/10"
              >
                <cat.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-title-medium text-on-surface">
                  {cat.title}
                </h3>
                <p className="mt-2 text-body-large text-on-surface-variant">
                  {cat.desc}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
