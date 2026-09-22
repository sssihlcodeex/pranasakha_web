import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { InstitutionsSectionBg } from "@/components/site/SectionBackground";
const institutions = [
  {
    name: "SSSIHMS, Prasanthigram",
    full: "Sri Sathya Sai Institute of Higher Medical Sciences",
    desc: "Super-speciality cardiac and neuro care, offered entirely free of charge.",
  },
  {
    name: "SSSIHMS, Whitefield",
    full: "Sri Sathya Sai Institute of Higher Medical Sciences",
    desc: "Advanced cardiology and neurosciences serving patients across Karnataka.",
  },
  {
    name: "SSSGH, Prasanthi Nilayam",
    full: "Sri Sathya Sai General Hospital",
    desc: "General and multi-speciality care for the Prasanthi Nilayam community.",
  },
  {
    name: "SSSGH, Whitefield",
    full: "Sri Sathya Sai General Hospital",
    desc: "Everyday primary and secondary care for surrounding villages.",
  },
  {
    name: "SSSMH — Mobile Hospital",
    full: "Sri Sathya Sai Mobile Hospital",
    desc: "Rural outreach bringing doctors and diagnostics to remote villages.",
  },
];
export function Institutions() {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const updateEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };
  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, []);
  const scrollByCard = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]");
    const step = (card?.offsetWidth ?? 300) + 20;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };
  return (
    <section
      id="institutions"
      className="relative overflow-hidden bg-surface-variant/40 py-24"
    >
      <InstitutionsSectionBg />

      <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.3 }}
            className="text-headline-medium text-on-surface"
          >
            Institutions We Serve
          </motion.h2>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              aria-label="Scroll left"
              disabled={!canScrollLeft}
              onClick={() => scrollByCard(-1)}
              className="m3-card-elevated flex h-10 w-10 items-center justify-center rounded-full text-on-surface transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              disabled={!canScrollRight}
              onClick={() => scrollByCard(1)}
              className="m3-card-elevated flex h-10 w-10 items-center justify-center rounded-full text-on-surface transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative mt-10">
          {/* Edge fade masks instead of a visible scrollbar */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-surface-variant/40 to-transparent transition-opacity duration-300 sm:w-16 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-surface-variant/40 to-transparent transition-opacity duration-300 sm:w-16 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
          />

          <div
            ref={trackRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
          >
            {institutions.map((inst, i) => (
              <motion.article
                key={inst.name}
                data-card
                initial={{ opacity: 0, x: 32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.3, delay: i * 0.08 }}
                className="m3-card-elevated w-[280px] shrink-0 snap-start p-6 transition-transform duration-300 hover:-translate-y-1 sm:w-[320px]"
              >
                <span className="m3-chip border-tertiary/50 text-tertiary">
                  {inst.full}
                </span>
                <h3 className="mt-4 text-title-medium text-on-surface">
                  {inst.name}
                </h3>
                <p className="mt-2 text-body-large text-on-surface-variant">
                  {inst.desc}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
