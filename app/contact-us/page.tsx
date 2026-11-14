import Link from "next/link";
import PolicyLayout, { PolicySection } from "@/components/policy-layout";
import { getSite } from "@/lib/site";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "যোগাযোগ ও সহায়তা",
  description:
    "প্রশ্নবুকের প্রকাশিত যোগাযোগ, কেনা কপির অভিযোগ এবং আর্থিক সহায়তার নির্দেশনা।",
};
export default async function Contact() {
  const site = await getSite(),
    email = site.contact.email.trim(),
    phone = site.contact.phone.trim(),
    validEmail = /^[^\s@?&#%]+@[^\s@?&#%]+\.[^\s@?&#%]+$/.test(email),
    validPhone = /^\+?[0-9 ()-]{6,25}$/.test(phone);
  return (
    <PolicyLayout title="যোগাযোগ ও সহায়তা">
      <PolicySection title="প্রকাশিত যোগাযোগের মাধ্যম">
        {validEmail && (
          <p>
            ইমেইল:{" "}
            <a className="underline" href={`mailto:${email}`}>
              {email}
            </a>
          </p>
        )}
        {validPhone && (
          <p>
            ফোন:{" "}
            <a
              className="underline"
              href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
            >
              {phone}
            </a>
          </p>
        )}
        {!validEmail && !validPhone && (
          <p role="status">
            সাইট কর্তৃপক্ষের যোগাযোগের ইমেইল/ফোন এখনও প্রকাশ করা হয়নি। এই পাতায় কোনো
            নতুন support ইমেইল অনুমান করে দেওয়া হচ্ছে না। কেনা প্রশ্নপত্রের জন্য নিচের
            নিজস্ব অভিযোগ ব্যবস্থা ব্যবহার করুন।
          </p>
        )}
        <p>
          এখানে প্রকাশিত মাধ্যম ছাড়া অন্য কারও কাছে login password, PIN, OTP বা
          গোপন payment তথ্য দেবেন না। এই পাতা নিজে বার্তা পাঠানোর form নয়। নির্দিষ্ট
          সময়ে উত্তর পাওয়ার নিশ্চয়তা নেই।
        </p>
      </PolicySection>
      <PolicySection title="কেনা প্রশ্নপত্রে সমস্যা">
        <p>
          <Link className="underline" href="/dashboard/library">
            নিজের কেনা প্রশ্নপত্রের লাইব্রেরি
          </Link>{" "}
          খুলে সংশ্লিষ্ট কপির ‘অভিযোগ / নিষ্পত্তির অবস্থা’ ব্যবহার করুন। শুধু নিজের কেনা
          কপিতে অভিযোগ করা যায়; অ্যাডমিন যাচাই ছাড়া রিফান্ড নয়। একই অভিযোগ বারবার
          জমা দিলেই দ্রুত নিষ্পত্তি হবে না।
        </p>
      </PolicySection>
      <PolicySection title="রিচার্জ, Send Money বা উত্তোলন">
        <p>
          নিজের{" "}
          <Link className="underline" href="/wallet">
            ওয়ালেট
          </Link>{" "}
          এবং{" "}
          <Link className="underline" href="/wallet/withdraw">
            উত্তোলনের অবস্থা
          </Link>{" "}
          দেখুন। সাহায্য চাইলে TID, ঘটনার সময়, পরিমাণ ও প্রাসঙ্গিক রসিদের পরিচয় দিন।
          পূর্ণ পেমেন্ট তথ্য প্রকাশ্য পোস্টে দেবেন না। ভুল প্রাপকে পাঠানো টাকা
          স্বয়ংক্রিয়ভাবে ফেরানোর ব্যবস্থা নেই।
        </p>
      </PolicySection>
      <PolicySection title="কপিরাইট ও ব্যক্তিগত তথ্য">
        <p>
          <Link className="underline" href="/dmca">
            কপিরাইট অভিযোগের প্রয়োজনীয় তথ্য
          </Link>{" "}
          এবং{" "}
          <Link className="underline" href="/privacy">
            গোপনীয়তা/তথ্য সংশোধনের নির্দেশনা
          </Link>{" "}
          দেখুন। যোগাযোগের মাধ্যম প্রকাশিত না থাকলে এসব সাধারণ অনুরোধ জমা দেওয়ার
          অনলাইন channel এখনও অসম্পূর্ণ; কেনাকাটার অভিযোগকে সাধারণ message inbox
          ভাববেন না।
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
