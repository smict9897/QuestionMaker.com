"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ───────── সেটিংস (এখানে বদলান) ───────── */
const STORAGE_KEY = "saifulsir_install_prompt_v1";
const SNOOZE_DAYS = 7; // "এখন নয়" চাপলে কত দিন পর আবার আসবে (0 = আর আসবে না)
const DELAY_MS = 2500; // পেজ খোলার কতক্ষণ পর popup আসবে
const APP_NAME = "SaifulSir";
const LOGO_SRC = "/logo.png"; // public/logo.png

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Stored = { done?: boolean; until?: number };

function readStore(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStore(v: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {}
}

function shouldShow() {
  const s = readStore();
  if (s.done) return false;
  if (s.until && Date.now() < s.until) return false;
  return true;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="5" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="19" r="2" fill="currentColor" />
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 15V4m0 0L8 8m4-4 4 4M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function InstallPrompt() {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const [canInstall, setCanInstall] = useState(false);
  const [ios, setIos] = useState(false);
  const deferred = useRef<InstallEvent | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((store?: Stored) => {
    if (store) writeStore(store);
    setPhase("out");
    window.setTimeout(() => setPhase("hidden"), 260);
  }, []);

  const snooze = useCallback(() => {
    if (SNOOZE_DAYS > 0) {
      close({ until: Date.now() + SNOOZE_DAYS * 86_400_000 });
    } else {
      close({ done: true });
    }
  }, [close]);

  // Service worker রেজিস্টার (ইনস্টল চালু করতে লাগে)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isStandalone() || !shouldShow()) return;
    setIos(isIOS());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferred.current = e as InstallEvent;
      setCanInstall(true);
    };
    const onInstalled = () => close({ done: true });

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => setPhase("in"), DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [close]);

  useEffect(() => {
    if (phase !== "in") return;
    primaryRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && snooze();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, snooze]);

  const onPrimary = async () => {
    if (canInstall && deferred.current) {
      await deferred.current.prompt();
      const { outcome } = await deferred.current.userChoice;
      deferred.current = null;
      setCanInstall(false);
      outcome === "accepted" ? close({ done: true }) : snooze();
      return;
    }
    close({ done: true });
  };

  if (phase === "hidden") return null;

  const steps = ios
    ? [
        <>
          Safari-র নিচে <span className="ip-chip"><ShareIcon /> Share</span> বাটনে ট্যাপ করুন
        </>,
        <>
          <b>Add to Home Screen</b> বেছে নিন
        </>,
        <>
          উপরের ডানে <b>Add</b> চাপলেই ইনস্টল শেষ
        </>,
      ]
    : [
        <>
          ব্রাউজারের <span className="ip-chip"><DotsIcon /> মেনু</span> খুলুন
        </>,
        <>
          <b>Install app</b> বা <b>Add to Home screen</b> বেছে নিন
        </>,
        <>ইনস্টল নিশ্চিত করুন</>,
      ];

  const primaryLabel = canInstall ? "অ্যাপ ইনস্টল করুন" : "বুঝেছি";

  return (
    <div className={`ip-root ${phase === "out" ? "ip-out" : "ip-in"}`} role="presentation">
      <div className="ip-backdrop" onClick={snooze} />

      <section
        className="ip-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ip-title"
        aria-describedby="ip-desc"
      >
        <div className="ip-handle" aria-hidden="true" />

        <header className="ip-head">
          <div className="ip-icon">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt="" width={44} height={44} />
          </div>
          <div>
            <h2 id="ip-title" className="ip-title">
              {APP_NAME} অ্যাপ ইনস্টল করুন
            </h2>
            <p id="ip-desc" className="ip-desc">
              ব্রাউজারে বারবার খুঁজতে হবে না। হোম স্ক্রিন থেকে এক ট্যাপেই খুলুন।
            </p>
          </div>
        </header>

        <ol className="ip-steps">
          {steps.map((s, i) => (
            <li key={i}>
              <span className="ip-num">{["১", "২", "৩"][i]}</span>
              <span className="ip-text">{s}</span>
            </li>
          ))}
        </ol>

        <div className="ip-actions">
          <button ref={primaryRef} type="button" className="ip-btn ip-primary" onClick={onPrimary}>
            {primaryLabel}
          </button>
          <button type="button" className="ip-btn ip-ghost" onClick={snooze}>
            এখন নয়
          </button>
        </div>
      </section>

      <style>{`
        .ip-root{
          --ip-ink:#10231a; --ip-muted:#5a6b62; --ip-line:#e4ece7;
          --ip-green:#1fb86a; --ip-green-d:#149556; --ip-tint:#eefaf3;
          position:fixed; inset:0; z-index:9999; font-family:inherit;
        }
        .ip-backdrop{
          position:absolute; inset:0; background:rgba(10,24,17,.48);
          -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px);
        }
        .ip-sheet{
          position:absolute; left:0; right:0; bottom:0;
          max-width:480px; margin:0 auto;
          background:#fff; color:var(--ip-ink);
          border-radius:26px 26px 0 0;
          padding:10px 20px calc(20px + env(safe-area-inset-bottom,0px));
          box-shadow:0 -12px 40px rgba(10,24,17,.22);
        }
        .ip-handle{width:40px; height:4px; border-radius:4px; background:#d5dfd9; margin:0 auto 16px;}
        .ip-head{display:flex; gap:14px; align-items:flex-start;}
        .ip-icon{
          flex:none; width:56px; height:56px; border-radius:16px;
          background:var(--ip-tint); border:1px solid var(--ip-line);
          display:grid; place-items:center; overflow:hidden;
        }
        .ip-icon img{width:44px; height:44px; object-fit:contain; border-radius:10px;}
        .ip-title{margin:2px 0 4px; font-size:19px; line-height:1.3; font-weight:700; letter-spacing:-.01em;}
        .ip-desc{margin:0; font-size:14px; line-height:1.6; color:var(--ip-muted);}
        .ip-steps{
          list-style:none; margin:18px 0 20px; padding:6px 14px;
          background:#f7faf8; border:1px solid var(--ip-line); border-radius:16px;
        }
        .ip-steps li{display:flex; align-items:center; gap:12px; padding:10px 0;}
        .ip-steps li + li{border-top:1px solid var(--ip-line);}
        .ip-num{
          flex:none; width:26px; height:26px; border-radius:50%;
          background:var(--ip-green); color:#fff;
          display:grid; place-items:center; font-size:13px; font-weight:700;
        }
        .ip-text{font-size:14.5px; line-height:1.55; color:#2b3d33;}
        .ip-text b{font-weight:700; color:var(--ip-ink);}
        .ip-chip{
          display:inline-flex; align-items:center; gap:4px; vertical-align:middle;
          padding:1px 8px; border-radius:999px; background:#fff;
          border:1px solid var(--ip-line); font-size:13px; font-weight:600; color:var(--ip-ink);
        }
        .ip-actions{display:grid; gap:10px;}
        .ip-btn{
          appearance:none; border:0; cursor:pointer; width:100%;
          height:52px; border-radius:14px; font:inherit; font-size:16px; font-weight:700;
          transition:transform .12s ease, background-color .15s ease;
        }
        .ip-btn:active{transform:scale(.985);}
        .ip-btn:focus-visible{outline:3px solid rgba(31,184,106,.45); outline-offset:2px;}
        .ip-primary{background:var(--ip-green); color:#fff; box-shadow:0 6px 16px rgba(31,184,106,.32);}
        .ip-primary:hover{background:var(--ip-green-d);}
        .ip-ghost{background:#f1f4f2; color:#34453b; font-weight:600; height:48px;}
        .ip-ghost:hover{background:#e8eeea;}
        .ip-in .ip-backdrop{animation:ip-fade .25s ease both;}
        .ip-in .ip-sheet{animation:ip-up .38s cubic-bezier(.2,.85,.25,1) both;}
        .ip-out .ip-backdrop{animation:ip-fade-out .24s ease both;}
        .ip-out .ip-sheet{animation:ip-down .24s ease-in both;}
        @keyframes ip-fade{from{opacity:0}to{opacity:1}}
        @keyframes ip-fade-out{from{opacity:1}to{opacity:0}}
        @keyframes ip-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes ip-down{from{transform:translateY(0)}to{transform:translateY(100%)}}
        @media (min-width:520px){ .ip-sheet{bottom:24px; border-radius:26px;} }
        @media (prefers-reduced-motion:reduce){
          .ip-in .ip-backdrop,.ip-in .ip-sheet,
          .ip-out .ip-backdrop,.ip-out .ip-sheet{animation-duration:.01ms;}
        }
      `}</style>
    </div>
  );
}
