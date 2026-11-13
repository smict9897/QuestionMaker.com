# বাস্তবায়নের অবস্থা

এই ফাইলটি মূল পরিকল্পনা থেকে আলাদা অগ্রগতি রেকর্ড। পরিকল্পনায় কোনো সুবিধা লেখা থাকলেই সেটি লাইভ হয়েছে ধরে নেওয়া যাবে না।

## প্রথম বাস্তবায়ন ধাপ

- প্রোফাইলে ডাটাবেজ ও PDF/Ready Paper নির্মাণব্যবস্থার দুটি সরাসরি প্রবেশপথ।
- স্থায়ী `QB-…` TID: সার্ভার user ID থেকে নির্ধারিত, ওয়ালেটের transaction lock-এর অধীনে unique Setting key-তে মালিকানা নিবন্ধিত। এটি গোপন credential নয়।
- প্রোফাইল ও ওয়ালেটে TID প্রদর্শন; অ্যাডমিন রিচার্জ তালিকায় নাম, TID, আবেদন এবং পেমেন্ট তথ্য প্রদর্শন।
- অ্যাডমিনের অনুমোদিত পরিমাণ লেখার সুযোগ, পরিমাণ বদলালে কারণ আবশ্যক।
- পেমেন্ট যাচাই নিশ্চিতকরণ, pending অবস্থায় বাটন নিষ্ক্রিয়, ফর্মে সাফল্য/ব্যর্থতার বার্তা।
- অনুমোদনের সময় fresh ADMIN role যাচাই, আবেদন-মালিকানা মিল, পরিমাণ সীমা এবং একবারের credit।
- আবেদিত পরিমাণ, অনুমোদিত পরিমাণ, কারণ, reviewer, সময় ও TID আবেদনের durable record-এ সংরক্ষণ।
- ওয়ালেট ইতিহাসে অনুমোদিত জমার পরিমাণ প্রদর্শন।
- বর্তমান একবারের ৳২০ বোনাসের ব্যবস্থা রাখা হয়েছে; পুরোনো ওয়ালেট নতুন করে reset হয় না।
- এই ধাপে schema migration বা বিদ্যমান ব্যালেন্স পরিবর্তনের script নেই।

## যাচাই

- Typecheck সফল।
- ৩৫৫টি automated test সফল।
- নতুন পরীক্ষায় stable TID, পুরোনো ব্যালেন্স সংরক্ষণ, অনুমতিহীন অনুমোদন প্রত্যাখ্যান, পরিবর্তিত পরিমাণের কারণ, integer paisa, concurrent approval-এ একবার credit এবং mismatch request প্রত্যাখ্যান অন্তর্ভুক্ত।
- পরীক্ষার wallet database mock transaction ও rollback ব্যবহার করে; এটি বাস্তব অর্থের লেনদেন বা authenticated production browser test-এর বিকল্প নয়।
- GitHub CI ও Vercel deployment অবস্থা PR-তে আলাদাভাবে দেখা যাবে।

## এখনও বাকি

- দুই builder-এর saved paper provenance ও স্থির বিক্রিযোগ্য snapshot একীভূত করা।
- মার্কেটপ্লেসের listing, আবেদন, moderation, class/subject/chapter navigation।
- protected preview/full-copy delivery এবং ক্রেতার শুধু প্রতিষ্ঠান-নাম পরিবর্তনযোগ্য print screen।
- purchase ownership ও atomic ৬০/৪০ revenue split।
- bonus/recharge/sales/transferred balance পৃথক রাখার পূর্ণ ledger এবং সব বর্তমান debit path-এর সামঞ্জস্য।
- Send Money।
- ৳১০০ ন্যূনতম বিক্রির আয় থেকে বিকাশ withdrawal এবং manual payout reconciliation।
- refund, complaints, policy এবং প্রয়োজনীয় limits।
- প্রশ্নবুক branding এবং মালিকানাধীন নতুন domain configuration।
- পূর্ণ end-to-end, mobile print এবং অনুমোদিত বাস্তব লেনদেন যাচাই।

অসম্পূর্ণ আর্থিক সুবিধার জন্য কোনো live button বা placeholder transaction চালু করা হয়নি। মূল পরিকল্পনা `README.md`-এ রয়েছে।

## দ্বিতীয় বাস্তবায়ন ধাপ: ডাটাবেজ প্রশ্নপত্রের বিক্রির আবেদন

- `/dashboard/sell`: লগইন করা মালিকের নিজের সংরক্ষিত ডাটাবেজ প্রশ্নপত্র থেকে আবেদন; dashboard-এ প্রবেশপথ।
- শ্রেণি ৬–১১, বিষয়, অধ্যায়, বিবরণ, মূল্য ও বিক্রির অধিকারসংক্রান্ত সম্মতি সংগ্রহ। এই পর্যায়ের মূল্য validation সীমা ৳১–৫০,০০০; এটি চূড়ান্ত marketplace pricing policy নয়।
- সার্ভার saved-paper key ও owner যাচাই করে, বর্তমান checkout entitlement যাচাই করে এবং প্রশ্নব্যাংক থেকে প্রকৃত প্রশ্ন নেয়। Client থেকে প্রশ্নের কপি গ্রহণ করা হয় না।
- প্রশ্নের ক্রম ও settings সহ private স্থির snapshot, SHA-256 checksum, উৎস, মালিক ও revision সংরক্ষণ। Snapshot সর্বোচ্চ ১ MB।
- একই source-এর duplicate আবেদন আটকানো; সংশোধন চাওয়া হলে একই আবেদনে নতুন revision জমা দেওয়া যায়।
- `/admin/marketplace`: fresh database ADMIN role যাচাই করে private review। বর্তমানে নিরাপদ text/JSON-এ পূর্ণ snapshot দেখা যায়; rendered A4 review এখনও বাকি।
- অনুমোদন/সংশোধন/বাতিল, কারণ, reviewer ও সময় সংরক্ষণ। নিজের আবেদন নিজে অনুমোদন নিষিদ্ধ। Stale revision, repeated review এবং checksum mismatch প্রত্যাখ্যান।
- অনুমোদিত আবেদন পরিবর্তন করে কপি বদলে দেওয়া যায় না। প্রশ্নব্যাংক বা মূল saved paper বদলালেও snapshot বদলায় না।
- Owner ও admin ছাড়া snapshot দেখার কোনো public route নেই। এই ধাপে marketplace purchase, credit/debit বা আয় বণ্টন নেই।
- **PDF/Ready Paper থেকে তৈরি কপির আবেদন এই ধাপে চালু করা হয়নি।** Paid source-page receipt এবং শিক্ষকের assembled final copy-কে আলাদা করতে হবে; অনুমতিহীন সরাসরি PDF পুনর্বিক্রি এড়াতে পরবর্তী ধাপে কাজ প্রয়োজন।
- প্রশ্নপত্রের বিষয়/অধ্যায় এই পর্যায়ে admin যাচাই করেন; catalog-validated subject/chapter dropdown পরবর্তী ধাপে প্রয়োজন।

### দ্বিতীয় ধাপের যাচাই

- Typecheck এবং ৩৬২টি automated test সফল।
- নতুন tests: metadata/মূল্য/সম্মতি, ownership, purchased-source প্রত্যাখ্যান, unpaid/unauthenticated access, immutable server snapshot, concurrent duplicate, admin role, stale review, revision/resubmission এবং approved copy অপরিবর্তনীয় রাখা।
- এটি mocked transaction-ভিত্তিক automated test; authenticated live browser বা বাস্তব টাকা দিয়ে পরীক্ষা করা হয়নি।
- প্রথম ধাপের পরে উপরের “এখনও বাকি” তালিকার application/moderation অংশ আংশিক সম্পন্ন হয়েছে; PDF snapshot, rendered A4 review, catalog, sales ledger, buyer print, Send Money, withdrawal ও end-to-end পরীক্ষা এখনও বাকি।

## পরীক্ষার ধরন সংযোজন

- শিক্ষক প্রোফাইলের নতুন বিক্রির আবেদন ফর্মে পরীক্ষার ধরন আবশ্যক: **অর্ধ বার্ষিক পরীক্ষা, বার্ষিক পরীক্ষা, নির্বাচনী পরীক্ষা**।
- একই তথ্য শিক্ষক নিজের আবেদন তালিকা এবং অ্যাডমিনের যাচাই পাতায় দেখতে পাবেন।
- Client-safe shared তালিকা `lib/marketplace-exam-types.ts`-এ রাখা হয়েছে; ভবিষ্যৎ marketplace card/filter-এও একই তালিকা ব্যবহার করতে হবে। প্রকাশ্য marketplace এখনও চালু হয়নি।
- নতুন আবেদনে পরীক্ষার ধরন সার্ভারেও যাচাই ও metadata-তে সংরক্ষণ করা হয়। পুরোনো আবেদনে কোনো ধরন অনুমান করে বসানো হয় না; “পরীক্ষার ধরন উল্লেখ করা হয়নি” দেখাবে।
- অনুমোদিত প্রশ্নপত্রের মূল snapshot বা পুরোনো ব্যক্তিগত প্রশ্নপত্রের পরীক্ষার শিরোনাম এই পরিবর্তনে বদলানো হয় না।

## তৃতীয় ধাপ: পাবলিক ক্যাটালগ ও শিক্ষকের প্রকাশ্য প্রোফাইল

- `/marketplace`: অনুমোদিত, বৈধ পরীক্ষার ধরনসহ প্রশ্নপত্রের পরিচিতি। শ্রেণি ৬–১১, বিষয় কার্ড, অধ্যায় ও তিন পরীক্ষার ধরন দিয়ে GET filter।
- হোমপেজে live paper animation-এর পরে শ্রেণিভিত্তিক ক্যাটালগের প্রবেশপথ; পুরোনো দুটি creation card ও animation-এর ক্রম অক্ষুণ্ণ।
- `/marketplace/[id]`: শুধু অনুমোদিত প্রশ্নপত্রের পরিচিতি ও মূল্য। Pending/rejected/invalid রেকর্ডে 404।
- `/teachers/[tid]`: নিবন্ধিত TID যাচাই করে শুধু প্রকাশ্য নাম, TID ও ক্যাটালগের অনুমোদিত পরিচিতি। ইমেইল, ফোন, প্রতিষ্ঠান/ঠিকানা, ব্যক্তিগত ব্যালেন্স প্রকাশ করা হয়নি। এটি verified-teacher badge নয়।
- public projection-এ শুধু id, sellerTid, validated metadata ও updatedAt আছে; snapshot, question text, answers, saved settings, source key, internal owner ID বা review notes ফেরত দেওয়া হয় না।
- ক্যাটালগে key cursor-ভিত্তিক পরবর্তী পাতা; প্রতি পাতায় সর্বোচ্চ ২০০ অনুমোদিত রেকর্ড। বিষয়/অধ্যায় filter এবং seller filter বর্তমান পাতায় প্রযোজ্য—UI-তে তা স্পষ্ট আছে। Database-normalized listing/index ছাড়া global filtered pagination দাবি করা হয়নি।
- শিক্ষক ও অ্যাডমিনকে এখন জানানো হয়: অনুমোদনে পরিচিতি প্রকাশিত হবে, পূর্ণ প্রশ্নপত্র নয়।
- কোনো fake sample, buy button, টাকা কাটা বা আয় বণ্টন চালু করা হয়নি। Public UI-তে স্পষ্টভাবে কেনাকাটা ও পূর্ণ প্রিভিউ এখনও বন্ধ বলা আছে।
- Typecheck এবং ৩৬৭টি automated test সফল। নতুন পরীক্ষায় public data allowlist, unapproved/invalid record exclusion, combined filters ও bounded pagination অন্তর্ভুক্ত। Authenticated live browser বা real-money end-to-end test হয়নি।

### এখনও গুরুত্বপূর্ণ বাকি

PDF assembled-copy provenance; rendered A4 admin review; protected sample and buyer print; catalog-validated subject/chapter selection; normalized global listing/filter indices; source-separated financial ledger and all existing debit paths; atomic purchase/৬০–৪০ distribution; Send Money; withdrawals/refunds; rebranding/domain authentication; full browser/mobile/real-payment verification।
