import { useEffect, useState } from "react";
import { getCurrentUser, ROLE_HOME } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import "./Hero.css";

const HERO_VIDEO_SRC = "/videos/HERO.mp4";
const HERO_POSTER_SRC = "/images/hero-poster.jpg";

export function Hero() {
  const [videoFailed, setVideoFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const sync = () => {
      setUser(getCurrentUser());
    };

    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("pranasakha-auth-changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pranasakha-auth-changed", sync);
    };
  }, []);

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-[#0b1330]">

      {/* =========================================================
          HERO VIDEO BACKGROUND
          ========================================================= */}

      {/* Fallback poster */}
      {!posterFailed && (
        <img
          src={HERO_POSTER_SRC}
          alt=""
          aria-hidden="true"
          onError={() => setPosterFailed(true)}
          className={`absolute inset-0 z-0 h-full w-full object-cover hero-poster ${
            videoFailed ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Main hero video */}
      {!videoFailed && (
        <video
          className="absolute inset-0 z-0 h-full w-full object-cover hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={posterFailed ? undefined : HERO_POSTER_SRC}
          onError={(event) => {
            console.error(
              "PRANASAKHA Hero video failed to load:",
              event
            );
            setVideoFailed(true);
          }}
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
      )}

      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0 z-[1] hero-scrim"
        aria-hidden="true"
      />

      {/* =========================================================
          JOURNEY ART
          ========================================================= */}

      <JourneyArt />

      {/* =========================================================
          HERO CONTENT
          ========================================================= */}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 pt-28 lg:px-8 lg:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
          }}
          className="max-w-3xl"
        >
          {/* Badge */}
          <span className="m3-chip border-secondary/60 bg-white/5 text-secondary backdrop-blur-sm">
            प्राणसखा · Friend of Life
          </span>

          {/* Heading */}
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-display-large">
            One Platform. Every Doctor. Every Act of Seva.
          </h1>

          {/* Description */}
          <p className="mt-6 max-w-2xl text-body-large text-white/80 sm:text-lg">
            PRANASAKHA connects volunteer doctors worldwide with Sri Sathya
            Sai Medical Institutions, turning the spirit of "Love All, Serve
            All" into one seamless path from intent to service.
          </p>

          {/* =====================================================
              ACTION BUTTONS
              ===================================================== */}

          <div className="mt-10 flex flex-wrap items-center gap-3">
            {user?.id ? (
              <>
                {/* Dashboard */}
                <Link
                  to={ROLE_HOME[user.role] || "/dashboard/doctor"}
                  className="m3-fab bg-secondary text-secondary-foreground"
                >
                  Dashboard
                </Link>

                {/* Profile */}
                <Link
                  to="/profile"
                  className="m3-btn-outlined !rounded-full !border-white !px-6 !py-4 !text-white hover:!bg-white/15"
                >
                  Profile
                </Link>
              </>
            ) : (
              <>
                {/* Register */}
                <Link
                  to="/signup"
                  className="m3-fab bg-secondary text-secondary-foreground"
                >
                  Register Now
                </Link>

                {/* Sign In */}
                <Link
                  to="/signin"
                  className="m3-btn-outlined !rounded-full !border-white !px-6 !py-4 !text-white hover:!bg-white/15"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* =====================================================
              STATS
              ===================================================== */}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.5,
            }}
            className="mt-16 flex flex-wrap items-center gap-x-10 gap-y-4"
          >
            {[
              ["5", "Sai institutions onboard"],
              ["1", "Digital Sai Medical Pass"],
              ["24/7", "Directorate-verified roster"],
            ].map(([stat, label]) => (
              <div key={label}>
                <div className="text-2xl font-extrabold text-white">
                  {stat}
                </div>

                <div className="text-sm text-white/65">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* =========================================================
          SCROLL CUE
          ========================================================= */}

      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          y: [0, 8, 0],
        }}
        transition={{
          opacity: {
            delay: 1,
            duration: 0.6,
          },
          y: {
            repeat: Infinity,
            duration: 1.8,
            ease: "easeInOut",
          },
        }}
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-white/60 sm:flex"
      >
        <span className="text-xs uppercase tracking-[0.2em]">
          Scroll
        </span>

        <span className="h-8 w-px bg-gradient-to-b from-white/60 to-transparent" />
      </motion.div>
    </section>
  );
}


/* =============================================================
   JOURNEY ART
   ============================================================= */

function JourneyArt() {
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 600 400"
      className="pointer-events-none absolute -right-16 bottom-0 z-[2] hidden h-[70%] w-auto opacity-60 lg:block"
      initial="hidden"
      animate="visible"
    >
      {/* Journey path */}
      <motion.path
        d="M40 320 C 160 300, 200 180, 300 180 S 460 120, 560 70"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        variants={{
          hidden: {
            pathLength: 0,
          },
          visible: {
            pathLength: 1,
          },
        }}
        transition={{
          duration: 1.6,
          ease: "easeInOut",
        }}
      />

      {/* Journey nodes */}
      {[
        {
          cx: 40,
          cy: 320,
        },
        {
          cx: 300,
          cy: 180,
        },
        {
          cx: 560,
          cy: 70,
        },
      ].map((p, i) => (
        <motion.circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r="9"
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="2"
          initial={{
            opacity: 0,
            scale: 0.6,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.4,
            delay: 0.4 + i * 0.35,
          }}
        />
      ))}

      {/* Medical cross */}
      <motion.path
        d="M270 150 h60 M300 120 v60"
        stroke="var(--color-tertiary)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.6,
          delay: 1.1,
        }}
      />

      {/* Final destination / hospital symbol */}
      <motion.path
        d="M520 70 l40 -34 l40 34"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.6,
          delay: 1.4,
        }}
      />
    </motion.svg>
  );
}