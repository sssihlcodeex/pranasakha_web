import {
  Activity,
  FileText,
  HeartPulse,
  QrCode,
  Cross,
  Sparkles,
  Users,
  Lock,
  ShieldCheck,
  Stethoscope,
  KeyRound,
} from "lucide-react";
import "./SectionBackground.css";
/** A soft blurred color blob that drifts slowly. Purely decorative. */
function Blob({ className, colorVar, size, reverse, duration }) {
  return (
    <div
      aria-hidden="true"
      className={`ps-blob absolute rounded-full blur-3xl ${reverse ? "animate-ps-float-rev" : "animate-ps-float"} ${duration ? "ps-blob-duration" : ""} ${className ?? ""}`}
      style={{
        "--blob-size": `${size}px`,
        "--blob-color": colorVar,
        ...(duration ? { "--blob-duration": `${duration}s` } : {}),
      }}
    />
  );
}
/** A faint, slowly floating icon glyph. Purely decorative. */
function FloatIcon({ icon: Icon, className, size = 22, reverse, delay }) {
  return (
    <Icon
      aria-hidden="true"
      className={`ps-float-icon absolute text-primary/10 dark:text-primary/15 ${reverse ? "animate-ps-float-rev" : "animate-ps-float"} ${delay ? "ps-float-icon-delay" : ""} ${className ?? ""}`}
      style={{
        "--icon-size": `${size}px`,
        ...(delay ? { "--icon-delay": `${delay}s` } : {}),
      }}
    />
  );
}
const wrap = "pointer-events-none absolute inset-0 overflow-hidden";
/** Why This Exists — heartbeat pulse line + soft brand blobs. */
export function WhySectionBg() {
  return (
    <div className={wrap} aria-hidden="true">
      <Blob
        colorVar="var(--color-primary)"
        size={340}
        className="-left-24 -top-24"
      />
      <Blob
        colorVar="var(--color-secondary)"
        size={280}
        reverse
        className="-right-16 top-10"
        duration={9}
      />
      <Blob
        colorVar="var(--color-tertiary)"
        size={260}
        className="bottom-[-80px] left-1/3"
        duration={10}
      />

      <svg
        className="absolute inset-x-0 top-1/2 h-24 w-full -translate-y-1/2 opacity-[0.14]"
        preserveAspectRatio="none"
      >
        <polyline
          points="-20,50 60,50 90,15 130,85 170,50 260,50 300,20 340,80 380,50 900,50"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <FloatIcon icon={FileText} className="left-[8%] top-[20%]" />
      <FloatIcon
        icon={HeartPulse}
        className="right-[12%] top-[62%]"
        reverse
        size={26}
        delay={1}
      />
      <FloatIcon icon={QrCode} className="left-[46%] bottom-[8%]" delay={2} />
    </div>
  );
}
/** Institutions We Serve — a faint connected "care network" of nodes. */
export function InstitutionsSectionBg() {
  return (
    <div className={wrap} aria-hidden="true">
      <Blob
        colorVar="var(--color-tertiary)"
        size={300}
        className="-right-20 -top-10"
        duration={11}
      />
      <Blob
        colorVar="var(--color-primary)"
        size={260}
        reverse
        className="-left-16 bottom-0"
      />

      <svg
        viewBox="0 0 800 300"
        className="absolute inset-0 h-full w-full opacity-[0.16]"
        preserveAspectRatio="none"
      >
        <g stroke="var(--color-tertiary)" strokeWidth="1.4" fill="none">
          <path
            d="M60 220 L220 90 L400 180 L560 60 L740 150"
            strokeDasharray="4 7"
            className="animate-ps-dash"
          />
          <path
            d="M220 90 L400 180"
            strokeDasharray="4 7"
            className="animate-ps-dash ps-dash-delay"
          />
        </g>
        {[
          [60, 220],
          [220, 90],
          [400, 180],
          [560, 60],
          [740, 150],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="5"
            fill="var(--color-secondary)"
            opacity="0.55"
          />
        ))}
      </svg>

      <FloatIcon
        icon={Cross}
        className="left-[6%] bottom-[16%]"
        size={20}
        delay={0.5}
      />
      <FloatIcon
        icon={Activity}
        className="right-[8%] top-[18%]"
        reverse
        size={24}
        delay={1.2}
      />
    </div>
  );
}
/** How it Works — particles travelling the timeline, echoing "the journey". */
export function HowItWorksSectionBg() {
  return (
    <div className={wrap} aria-hidden="true">
      <Blob
        colorVar="var(--color-secondary)"
        size={260}
        className="left-1/4 -top-16"
        duration={9}
      />
      <Blob
        colorVar="var(--color-primary)"
        size={240}
        reverse
        className="-right-10 bottom-0"
      />

      {[0, 2.3, 4.6].map((delay, i) => (
        <span
          key={i}
          className="ps-drift absolute top-6 h-2.5 w-2.5 rounded-full bg-secondary/50 md:top-6"
          style={{ "--drift-delay": `${delay}s` }}
        />
      ))}

      <FloatIcon
        icon={Sparkles}
        className="right-[10%] top-[70%]"
        size={20}
        delay={0.8}
      />
      <FloatIcon
        icon={QrCode}
        className="left-[4%] bottom-[6%]"
        size={22}
        reverse
        delay={1.6}
      />
    </div>
  );
}
/** Who Can Join — icons gently orbiting a faint ring, evoking a connected team. */
export function WhoCanJoinSectionBg() {
  return (
    <div className={wrap} aria-hidden="true">
      <Blob
        colorVar="var(--color-primary)"
        size={320}
        className="-left-24 top-1/3"
        duration={10}
      />
      <Blob
        colorVar="var(--color-tertiary)"
        size={240}
        reverse
        className="-right-14 -top-10"
      />

      <div className="absolute -right-24 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full border border-primary/10 animate-ps-spin-slow">
        <Users
          className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 text-primary/20"
          aria-hidden="true"
        />
      </div>

      <FloatIcon
        icon={Stethoscope}
        className="left-[10%] top-[14%]"
        size={22}
        delay={0.4}
      />
      <FloatIcon
        icon={ShieldCheck}
        className="left-[45%] bottom-[10%]"
        reverse
        size={20}
        delay={1.4}
      />
    </div>
  );
}
/** Trust & Security — pulsing shield rings, like a security radar. */
export function TrustSecuritySectionBg() {
  return (
    <div className={wrap} aria-hidden="true">
      <div className="absolute right-[6%] top-1/2 -translate-y-1/2">
        {[0, 1.2, 2.4].map((delay, i) => (
          <span
            key={i}
            className="ps-radar-ring absolute left-1/2 top-1/2 rounded-full border border-tertiary/30 animate-ps-pulse-soft"
            style={{
              "--ring-size": `${140 + i * 70}px`,
              "--ring-delay": `${delay}s`,
            }}
          />
        ))}
      </div>

      <FloatIcon
        icon={Lock}
        className="left-[8%] top-[20%]"
        size={22}
        delay={0.3}
      />
      <FloatIcon
        icon={ShieldCheck}
        className="left-[20%] bottom-[16%]"
        reverse
        size={20}
        delay={1.1}
      />
    </div>
  );
}
/** Sign in / Sign up — calm drifting blobs behind the auth card. */
export function AuthSectionBg() {
  return (
    <div className={wrap} aria-hidden="true">
      <Blob
        colorVar="var(--color-primary)"
        size={380}
        className="-left-32 -top-32"
        duration={12}
      />
      <Blob
        colorVar="var(--color-secondary)"
        size={300}
        reverse
        className="-right-20 top-1/4"
        duration={10}
      />
      <Blob
        colorVar="var(--color-tertiary)"
        size={260}
        className="bottom-[-100px] left-1/3"
        duration={13}
      />

      <FloatIcon
        icon={KeyRound}
        className="left-[10%] top-[16%]"
        size={22}
        delay={0.4}
      />
      <FloatIcon
        icon={ShieldCheck}
        className="right-[10%] top-[22%]"
        reverse
        size={24}
        delay={1}
      />
      <FloatIcon
        icon={HeartPulse}
        className="left-[14%] bottom-[14%]"
        size={20}
        delay={1.6}
      />
      <FloatIcon
        icon={Cross}
        className="right-[14%] bottom-[18%]"
        reverse
        size={22}
        delay={0.8}
      />
    </div>
  );
}
