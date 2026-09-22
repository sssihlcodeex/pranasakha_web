import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import "./LaunchOverlay.css";
const MARIGOLD_COLORS = ["#F97316", "#FBBF24", "#EA580C", "#FDE68A"];
function makeEmbers(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 3 + Math.random() * 94,
    delay: Math.random() * 1,
    size: 8 + Math.random() * 10,
  }));
}
function makePetals(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.6,
    size: 8 + Math.random() * 9,
    rotate: Math.random() * 360,
  }));
}
function PulseLine({ launching }) {
  return (
    <motion.svg
      viewBox="0 0 1200 120"
      className="pointer-events-none absolute left-0 top-1/2 z-20 h-24 w-full -translate-y-1/2"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M0 60 H420 L460 60 L480 15 L510 105 L540 40 L565 60 H1200"
        fill="none"
        stroke="#FDE68A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={
          launching
            ? { pathLength: 1, opacity: [0, 1, 1, 0] }
            : { pathLength: 0, opacity: 0 }
        }
        transition={{ duration: 1.6, delay: 0.5, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}
function Ember({ ember }) {
  return (
    <motion.div
      className="pointer-events-none absolute bottom-0 rounded-full launch-ember"
      style={{
        "--ember-left": `${ember.left}%`,
        "--ember-size": `${ember.size}px`,
      }}
      initial={{ y: 0, opacity: 0, scale: 0.4 }}
      animate={{
        y: "-108vh",
        x: [0, 12, -10, 6, 0],
        opacity: [0, 1, 1, 0],
        scale: [0.4, 1, 1, 0.3],
      }}
      transition={{
        duration: 4,
        delay: ember.delay,
        ease: "easeOut",
        times: [0, 0.15, 0.8, 1],
      }}
    />
  );
}
export function LaunchOverlay() {
  const [launching, setLaunching] = useState(false);
  const [visible, setVisible] = useState(true);
  const [embers] = useState(() => makeEmbers(28));
  const [petals] = useState(() => makePetals(40));
  function handleLaunch() {
    setLaunching(true);
    window.setTimeout(() => setVisible(false), 4000);
  }
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="launch-overlay"
          className="fixed inset-0 z-[100] overflow-hidden bg-[#0b1330]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Warm inner glow, like temple lighting */}
          <div className="pointer-events-none absolute inset-0 launch-inner-glow" />

          {/* Pulse / EKG line — the heartbeat of care, drawn at the moment of launch */}
          <PulseLine launching={launching} />

          {/* Golden flash at the moment the gates part */}
          {launching && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-40 launch-flash"
              initial={{ opacity: 0.85, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2.6 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          )}

          {/* Marigold petals drifting down — offering, celebration */}
          {launching &&
            petals.map((p) => (
              <motion.span
                key={p.id}
                className="pointer-events-none absolute top-[-5%] launch-petal"
                style={{
                  "--petal-left": `${p.left}%`,
                  "--petal-width": `${p.size}px`,
                  "--petal-height": `${p.size * 0.7}px`,
                  "--petal-color":
                    MARIGOLD_COLORS[p.id % MARIGOLD_COLORS.length],
                }}
                initial={{ y: 0, rotate: p.rotate, opacity: 0 }}
                animate={{
                  y: "115vh",
                  x: [0, 20, -20, 0],
                  rotate: p.rotate + 200,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 4.2 + Math.random() * 1.4,
                  delay: p.delay,
                  ease: "linear",
                }}
              />
            ))}

          {/* Rising embers of light — Seva carried upward */}
          {launching && embers.map((e) => <Ember key={e.id} ember={e} />)}

          {/* Left temple gate */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 launch-gate-left"
            animate={launching ? { x: "-102%" } : { x: 0 }}
            transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
          >
            <div className="absolute inset-0 opacity-20 launch-gate-texture-left" />
            {/* soft golden edge glow only, no hard seam line */}
            <div className="absolute inset-y-0 right-0 w-10 launch-gate-edge-left" />
          </motion.div>

          {/* Right temple gate */}
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 launch-gate-right"
            animate={launching ? { x: "102%" } : { x: 0 }}
            transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
          >
            <div className="absolute inset-0 opacity-20 launch-gate-texture-right" />
            <div className="absolute inset-y-0 left-0 w-10 launch-gate-edge-right" />
          </motion.div>

          {/* Center ceremonial content */}
          <AnimatePresence>
            {!launching && (
              <motion.div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.4 }}
              >
                {/* Sri Sathya Sai Central Trust emblem */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                  className="relative"
                >
                  <div className="absolute inset-0 -m-3 rounded-full launch-emblem-glow" />
                  <img
                    src="/images/sssct.jpeg"
                    alt="Sri Sathya Sai Central Trust"
                    className="relative h-20 w-20 rounded-full border-2 border-amber-200/60 object-cover shadow-lg sm:h-24 sm:w-24"
                  />
                </motion.div>

                <motion.span
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-4 text-label-medium uppercase tracking-[0.35em] text-amber-200/80"
                >
                  Sri Sathya Sai Central Trust presents
                </motion.span>

                <motion.span
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.52 }}
                  className="mt-4 rounded-full border border-secondary/50 bg-white/5 px-4 py-1.5 text-label-medium uppercase tracking-[0.2em] text-secondary backdrop-blur-sm"
                >
                  प्राणसखा · Friend of Life
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.66 }}
                  className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-6xl"
                >
                  The Official Launch of
                  <span className="mt-1 block bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent">
                    PRANASAKHA
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.82 }}
                  className="mt-5 max-w-xl text-body-large text-white/80"
                >
                  Every lamp we light is a doctor answering the call to serve.
                  Join us as we open the gates to a new path from "Love All" to
                  "Serve All."
                </motion.p>

                <motion.button
                  type="button"
                  onClick={handleLaunch}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-secondary via-amber-400 to-secondary bg-[length:200%_100%] px-9 py-4 text-base font-semibold text-secondary-foreground shadow-[0_0_40px_rgba(249,115,22,0.5)]"
                >
                  <motion.span
                    className="absolute inset-0 rounded-full bg-white/30"
                    animate={{ opacity: [0.4, 0, 0.4] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="relative">Light the Lamp · Launch</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
