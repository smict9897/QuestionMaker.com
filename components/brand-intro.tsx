import { BRAND } from "@/lib/brand";
import "./brand-intro.css";

/** CSS starts on mount, without timers, hydration-dependent markup or a blocking splash. */
export default function BrandIntro() {
  return (
    <section
      className="qm-intro"
      aria-label={`${BRAND.nameBn} — ${BRAND.tagline}`}
    >
      <div className="qm-intro-orbit" aria-hidden="true" />
      <div className="qm-intro-content">
        {/* 1. Spring-like overshoot. 4. A single clipped glare crosses the icon. */}
        <div className="qm-intro-icon" aria-hidden="true">
          {/* Fixed dimensions prevent layout shift; local PNG requires no external service. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/questionmaker-icon.png"
            width="112"
            height="112"
            alt=""
            fetchPriority="high"
          />
          <span className="qm-intro-glare" />
        </div>
        <div className="qm-intro-copy">
          <span className="qm-intro-eyebrow">
            THOUGHTFULLY BUILT FOR EDUCATORS
          </span>
          {/* 2. Wordmark slides left-to-right. Teal domain gently pulses twice, never flashes. */}
          <h2 className="qm-intro-name">
            {BRAND.nameBn}
          </h2>
          {/* 3. Tagline fades upward after the wordmark lands. */}
          <p className="qm-intro-tagline">{BRAND.tagline}</p>
          <span className="qm-intro-rule" />
        </div>
      </div>
    </section>
  );
}
