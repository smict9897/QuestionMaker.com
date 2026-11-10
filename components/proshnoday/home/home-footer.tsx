// প্রশ্নোদয় — হোমপেজের ফুটার (সার্ভার কম্পোনেন্ট)
import Link from "next/link";

import { db } from "@/lib/db";
import { getSite } from "@/lib/site";

type L = [label: string, href: string];

const platform: L[] = [
  ["হোম", "/"],
  ["প্রশ্নপত্র তৈরি", "/question-builder"],
  ["কুইজ", "/quiz"],
  ["ব্লগ", "/blog"],
  ["প্যাকেজ", "/packages"],
];

const people: L[] = [
  ["ড্যাশবোর্ড", "/dashboard"],
  ["লাইভ মডেল টেস্ট", "/model-test"],
  ["লিডারবোর্ড", "/model-test/leaderboard"],
  ["লগইন", "/login"],
];

const policy: L[] = [
  ["আমাদের সম্পর্কে", "/about-us"],
  ["যোগাযোগ", "/contact-us"],
  ["গোপনীয়তা নীতি", "/privacy"],
  ["ব্যবহারের শর্ত", "/terms"],
  ["দাবিত্যাগ", "/disclaimer"],
  ["DMCA নীতি", "/dmca"],
];

export default async function HomeFooter() {
  const [site, pages] = await Promise.all([
    getSite(),
    db.page
      .findMany({ select: { slug: true, title: true }, orderBy: { title: "asc" } })
      .catch(() => []),
  ]);

  const { siteName, tagline, footerText, contact } = site;
  const socials = site.social ? site.social.filter((s) => s.url) : [];
  const year = new Intl.NumberFormat("bn-BD", { useGrouping: false }).format(
    new Date().getFullYear()
  );

  return (
    <footer className="qk-footer">
      <div className="qk-wrap">
        <div className="qk-fgrid">
          <div className="qk-footer-brand">
            <Link href="/" className="qk-logo" aria-label={`${siteName} হোম`}>
              <span className="qk-mark">
                <svg className="qk-i" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </span>
              <span>
                <b>{siteName}</b>
                <small>{tagline}</small>
              </span>
            </Link>
            <p style={{ marginTop: 12, fontSize: 15, maxWidth: 320 }}>{footerText}</p>

            {socials.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                {socials.map(({ name, icon: Icon, url }) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    title={name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 38,
                      height: 38,
                      padding: 0,
                      borderRadius: 10,
                      background: "rgba(255,255,255,.08)",
                      border: "1px solid rgba(255,255,255,.14)",
                      color: "#fff",
                    }}
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4>{siteName}</h4>
            {platform.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>

          <div>
            <h4>শিক্ষক ও শিক্ষার্থী</h4>
            {people.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>

          <div className="qk-footer-policy">
            <h4>নীতিমালা ও সহায়তা</h4>
            <div className="qk-footer-policy-links">
            {policy.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
            {Array.isArray(pages) &&
              pages.map((pg) => (
                <Link key={pg.slug} href={`/p/${pg.slug}`}>
                  {pg.title}
                </Link>
              ))}
            {contact?.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : null}
            {contact?.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
            </div>
          </div>
        </div>

        <div className="qk-copy">
          © {year} {siteName}। সর্বস্বত্ব সংরক্ষিত।
        </div>
      </div>
    </footer>
  );
}

// ===== ফাইল শেষ =====
