import Link from "next/link";
import PolicyLayout, { PolicySection } from "@/components/policy-layout";
export const metadata = {
  title: "কুকি ও স্থানীয় সংরক্ষণ",
  description:
    "প্রশ্নবুকের login session, theme, install পছন্দ ও স্থানীয় draft সংরক্ষণ।",
};
export default function Cookies() {
  return (
    <PolicyLayout title="কুকি ও স্থানীয় সংরক্ষণ">
      <PolicySection title="কেন সংরক্ষণ করা হয়">
        <p>
          লগইন session চালু রাখতে cookie, theme ও install prompt-এর পছন্দ রাখতে
          local storage এবং কিছু draft/ফাইলের জন্য browser storage ব্যবহার হতে
          পারে। কিছু কাজ শুধু device/browser-এ থাকে; account-এ সফলভাবে save না হলে
          অন্য device-এ পাওয়া যাবে না।
        </p>
      </PolicySection>
      <PolicySection title="আপনার নিয়ন্ত্রণ">
        <p>
          Browser settings থেকে cookie/storage মুছতে বা সীমিত করতে পারেন। এতে
          logout হতে পারে, install পছন্দ reset হতে পারে এবং local draft/ফাইল
          হারাতে পারে। Native browser zoom বন্ধ করা হয় না। শেয়ার করা device-এ
          logout করুন।
        </p>
        <p>
          Google login ও Vercel Analytics-এর মতো যুক্ত প্রযুক্তির নিজস্ব নিয়ম রয়েছে।
          এই পাতা সব third-party tracking-এর পূর্ণ inventory বা কোনো
          consent-management tool চালু থাকার দাবি নয়। অতিরিক্ত জানতে{" "}
          <Link className="underline" href="/privacy">
            গোপনীয়তা নীতি
          </Link>{" "}
          ও{" "}
          <Link className="underline" href="/contact-us">
            যোগাযোগ
          </Link>{" "}
          দেখুন।
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
