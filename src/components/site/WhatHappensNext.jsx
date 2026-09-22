import { motion } from "motion/react";
import {
  Stethoscope,
  ShieldCheck,
  Building2,
  BedDouble,
  Landmark,
  Plane,
  Server,
  Settings2,
} from "lucide-react";
import { WhoCanJoinSectionBg } from "@/components/site/SectionBackground";
const roles = [
  {
    icon: Stethoscope,
    title: "Visiting Doctor",
    desc: "Apply, get verified and serve at any Sai institution.",
  },
  {
    icon: ShieldCheck,
    title: "Director / Joint Director",
    desc: "Review applications and approve volunteer intake.",
  },
  {
    icon: Building2,
    title: "Department HoD",
    desc: "Confirm speciality fit and shape the duty roster.",
  },
  {
    icon: BedDouble,
    title: "Ashram Accommodation Office",
    desc: "Allocate stay for arriving volunteer doctors.",
  },
  {
    icon: Landmark,
    title: "Mandir Committee",
    desc: "Coordinate darshan and ashram protocols for guests.",
  },
  {
    icon: Plane,
    title: "Travel & Visa Desk",
    desc: "Support invitation letters and travel documentation.",
  },
  {
    icon: Server,
    title: "IT Team",
    desc: "Maintain access, passes and platform integrity.",
  },
  {
    icon: Settings2,
    title: "Admin",
    desc: "Oversee institutions, users and system configuration.",
  },
];
export function WhatHappensNext() {
  return (
    <section className="relative overflow-hidden bg-surface-variant/40 py-24">
      <WhoCanJoinSectionBg />

      <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.3 }}
          className="text-headline-medium text-on-surface"
        >
          What Happens Next
        </motion.h2>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role, i) => (
            <motion.article
              key={role.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.25, delay: (i % 4) * 0.06 }}
              className="m3-card-outlined p-5"
            >
              <role.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-title-medium text-on-surface">
                {role.title}
              </h3>
              <p className="mt-1 text-body-large text-on-surface-variant">
                {role.desc}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
