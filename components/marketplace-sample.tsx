import type { MarketSample } from "@/lib/marketplace-sample";
import "./marketplace-sample.css";
export default function MarketplaceSample({
  sample,
}: {
  sample: MarketSample | null;
}) {
  return (
    <section className="market-sample" aria-labelledby="market-sample-heading">
      <h2 id="market-sample-heading">আসল প্রশ্নপত্রের সীমিত নমুনা</h2>
      {sample?.excerpts.length ? (
        <>
          <p>
            সংরক্ষিত প্রশ্নপত্রে {sample.questionCount.toLocaleString("bn-BD")}টি
            প্রশ্ন। নিচে সর্বোচ্চ দুটি প্রশ্নের শুরুর অংশ দেখানো হয়েছে; এটি পূর্ণ পৃষ্ঠা বা
            সম্পূর্ণ প্রশ্ন নয়।
          </p>
          <div className="market-sample-sheet">
            <div className="market-sample-watermark" aria-hidden="true">
              প্রশ্নবুক · নমুনা
            </div>
            <ol>
              {sample.excerpts.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ol>
            <p className="market-sample-stamp">
              শুধু কেনার আগে যাচাইয়ের নমুনা · সম্পূর্ণ কপি নয়
            </p>
          </div>
        </>
      ) : (
        <p>
          এই প্রশ্নপত্রের নিরাপদ পাঠ্য নমুনা দেখানো যাচ্ছে না। এটিকে প্রশ্নপত্র ফাঁকা
          থাকার প্রমাণ মনে করবেন না; কিনতে চাইলে বিবরণ ও বিক্রেতার তথ্য যাচাই করুন।
        </p>
      )}
      <p>
        উত্তর/অপশন, ছবি, সংযুক্তি ও অবশিষ্ট প্রশ্ন এই নমুনায় পাঠানো হয় না। নমুনায় প্রশ্নের
        ভেতরে ভুলবশত লেখা উত্তর সম্পূর্ণ শনাক্ত করার নিশ্চয়তা নেই। জলছাপ স্ক্রিনশট বা কপি
        করা পুরোপুরি আটকাতে পারে না। পূর্ণ বিন্যাস কেনা কপিতে থাকবে।
      </p>
    </section>
  );
}
