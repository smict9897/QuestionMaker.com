import Image from "next/image";
import Link from "next/link";
import { isHtml, renderHtml } from "@/lib/html";

const img = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/;
const blob = /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//;
const tagRe = /((?:^|(?<=[\s(]))#[\p{L}\p{M}\p{N}_-]{1,40})/u;

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(tagRe).map((part, i) =>
        i % 2 === 1 ? (
          <Link key={i} href={`/tag/${encodeURIComponent(part.slice(1).toLowerCase())}`} className="text-royal hover:underline">{part}</Link>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function PostBody({ body }: { body: string }) {
  if (!body) return null;

  // 🎯 HTML হলে সম্পূর্ণ ডিজাইন ও রেসপনসিভ টেবিল সহ হুবহু রেন্ডার হবে
  if (isHtml(body)) {
    return (
      <div 
        className="post-html raw-html not-prose w-full overflow-hidden mt-6" 
        dangerouslySetInnerHTML={{ __html: renderHtml(body) }} 
      />
    );
  }

  // প্লেইন টেক্সট বা মার্কডাউনের জন্য আগের কোড
  return (
    <div className="mt-6 grid gap-4 leading-relaxed text-slate-800 dark:text-slate-100">
      {body.split(/\n{2,}/).map((raw, i) => {
        const t = raw.trim();
        const m = t.match(img);
        if (m && blob.test(m[2])) {
          return <Image key={i} src={m[2]} alt={m[1]} width={1200} height={800} sizes="(max-width: 768px) 100vw, 672px" className="h-auto w-full rounded-2xl" />;
        }
        if (m) {
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={m[2]} alt={m[1]} loading="lazy" className="h-auto w-full rounded-2xl" />;
        }
        if (t.startsWith("### ")) return <h3 key={i} className="mt-2 text-xl font-bold">{t.slice(4)}</h3>;
        if (t.startsWith("## ")) return <h2 key={i} className="mt-4 text-2xl font-bold">{t.slice(3)}</h2>;
        return <p key={i} className="whitespace-pre-line"><Inline text={t} /></p>;
      })}
    </div>
  );
}
