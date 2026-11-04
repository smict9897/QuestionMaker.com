import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Tinos } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { MessageCircle } from "lucide-react";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { getSite } from "@/lib/site";
import { qkHead, qkBody } from "@/lib/qk-fonts";
import PathGate from "@/components/proshnoday/shell/path-gate";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import { SessionProvider } from "next-auth/react";

// প্রশ্নোদয়: সাইটের মূল ঠিকানা (Vercel-এ SITE_URL সেট থাকলে সেটি, না হলে এই ডিফল্ট)
const SITE_URL = process.env.SITE_URL ?? "https://question-maker-com-g6ec.vercel.app";

// 🎯 ১. আদর্শলিপিতে শুধুমাত্র বাংলা ইউনিকোড রেঞ্জ (প্রশ্নপত্র ছাপার জন্য)
const bn = localFont({
  src: "./fonts/AdorshoLipi.ttf",
  variable: "--font-bn",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0980-09FF, U+200C-200D",
    },
  ],
});

// 🎯 ২. ইংরেজি ও গণিতের ফন্টের জন্য Tinos (Times New Roman)
const en = Tinos({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-en",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${site.siteName} | ${site.tagline}`,
      template: `%s | ${site.siteName}`,
    },
    description: site.metaDescription,
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
  };
}

const themeScript = "try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [n, u, site] = await Promise.all([
    db.notice.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } }).catch(() => null),
    auth().then((s) => s?.user),
    getSite(),
  ]);
  const wa = site.social.find((s) => s.name === "WhatsApp")?.url;

  return (
    <html
      lang="bn"
      className={`${bn.variable} ${en.variable} ${qkHead.variable} ${qkBody.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />

        {/* 🎯 গুগল ব্র্যান্ড স্কিমা */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": site.siteName,
              "url": SITE_URL,
              "potentialAction": {
                "@type": "SearchAction",
                "target": `${SITE_URL}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string"
              }
            }),
          }}
        />

        {/* 🎯 KaTeX গাণিতিক ফর্মুলার অফিসিয়াল স্টাইলশিট */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
      </head>

      <body
        className="pb-16 md:pb-0"
        style={{
          fontFamily: 'var(--font-en), "Times New Roman", var(--font-bn), serif',
        }}
      >
        <SessionProvider>
          {/* হোমপেজ (/) ও ড্যাশবোর্ডে এই অংশ লুকায়, কারণ ওই পেজের নিজস্ব হেডার ও মেনু আছে */}
          <PathGate>
            <SiteHeader
              user={u ? { name: u.name, role: u.role } : null}
              logout={logout}
              notice={n?.text ?? `স্বাগতম ${site.siteName}-এ`}
            />
          </PathGate>

          <main>{children}</main>

          <PathGate>
            <SiteFooter />
          </PathGate>

          {/* মোবাইলের নিচের স্মার্ট অ্যাপ বার */}
          <PathGate>
            <MobileBottomNav user={u ? { name: u.name, role: u.role } : null} />
          </PathGate>

          {wa && (
            <PathGate>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg md:bottom-6 hover:scale-105 transition-transform"
              >
                <MessageCircle size={26} />
              </a>
            </PathGate>
          )}

          <InstallPrompt />
          <Analytics />
        </SessionProvider>
      </body>
    </html>
  );
}

// ===== ফাইল শেষ =====
