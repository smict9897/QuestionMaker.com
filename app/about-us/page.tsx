import Link from "next/link";
import PolicyLayout, { PolicySection } from "@/components/policy-layout";
export const metadata = {
  title: "আমাদের পরিচিতি",
  description:
    "প্রশ্নবুক.কম — শিক্ষককেন্দ্রিক প্রশ্নপত্র তৈরি, সংরক্ষণ ও অনুমোদিত প্রশ্নপত্রের মার্কেটপ্লেস।",
};
export default function About() {
  return (
    <PolicyLayout title="প্রশ্নবুক.কম সম্পর্কে">
      <PolicySection title="শিক্ষকদের প্রশ্নপত্রের কাজ এক জায়গায়">
        <p>
          প্রশ্নবুক / Proshnobook-এ ষষ্ঠ থেকে দ্বাদশ শ্রেণির অনুমোদিত প্রশ্নপত্রের পরিচিতি
          খোঁজা যায়। শিক্ষক প্রোফাইলে বিদ্যমান প্রশ্ন তৈরির সরঞ্জাম, সংরক্ষিত কাজ,
          ওয়ালেট ও কেনা কপির লাইব্রেরি পাওয়া যায়। তালিকায় প্রশ্নপত্র না থাকলে কৃত্রিম
          বিক্রির কার্ড দেখানো হয় না।
        </p>
      </PolicySection>
      <PolicySection title="কেনা–বেচা ও যাচাই">
        <p>
          নিজের যোগ্য সংরক্ষিত database প্রশ্নপত্র বিক্রির আবেদন admin যাচাই করেন।
          ক্রেতা মূল্য নিশ্চিত করে স্থির কপি কিনতে পারেন; প্রতিষ্ঠানের নাম বদলে প্রিন্ট
          করা যায়। বিক্রির ৬০% আয় বিক্রেতার হিসেবে আসে। নিজের তৈরি assembled PDF
          বিক্রির পূর্ণ সুবিধা এখনও বাকি—সাধারণ upload বা কেনা PDF কপি নিজস্ব তৈরি
          হিসেবে বিক্রির যোগ্য নয়।
        </p>
      </PolicySection>
      <PolicySection title="সীমাবদ্ধতা ও দায়িত্ব">
        <p>
          নমুনা সীমিত, AI ফল বা সংরক্ষিত প্রশ্ন ভুলমুক্ত থাকার নিশ্চয়তা নেই। পরীক্ষায়
          ব্যবহারের আগে নিজে যাচাই করুন। এই সাইট কোনো সরকারি বোর্ডের অনুমোদন বা
          সংযুক্তি দাবি করছে না। বৈশিষ্ট্য, মূল্য, রিফান্ড ও যোগাযোগের তথ্য সংশ্লিষ্ট
          পাতায় দেওয়া আছে।
        </p>
        <p>
          <Link className="underline" href="/marketplace">
            প্রশ্নপত্র দেখুন
          </Link>{" "}
          ·{" "}
          <Link className="underline" href="/dashboard">
            নিজের প্রোফাইল
          </Link>{" "}
          ·{" "}
          <Link className="underline" href="/contact-us">
            যোগাযোগ
          </Link>
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
