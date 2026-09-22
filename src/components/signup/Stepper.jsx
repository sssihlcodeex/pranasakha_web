import { motion } from "motion/react";
import { STEPS } from "./types";
export function Stepper({ current, onJump }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-label={`Step ${i + 1}: ${label}`}
            aria-current={i === current ? "step" : undefined}
            onClick={() => i < current && onJump(i)}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i === current
                ? "bg-secondary"
                : i < current
                  ? "cursor-pointer bg-primary"
                  : "bg-surface-variant"
            }`}
          />
        ))}
      </div>
      <motion.p
        key={current}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-3 text-label-medium uppercase text-on-surface-variant"
      >
        Step {current + 1} of {STEPS.length} · {STEPS[current]}
      </motion.p>
    </div>
  );
}
