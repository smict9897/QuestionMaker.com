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

## চতুর্থ ধাপ: ব্যক্তিগত পৃষ্ঠা প্রিভিউ / অ্যাডমিনের A4 যাচাই

- `/dashboard/sell/[id]`: fresh database user/role যাচাই করে কেবল মালিক শিক্ষক বা ADMIN জমা দেওয়া স্থির কপি দেখতে পারবেন। অন্যদের 404; লগইন ছাড়া login-এ পাঠানো হয়।
- অনুমোদনের তালিকা ও শিক্ষকের নিজের আবেদন তালিকা থেকে প্রিভিউ লিংক। পূর্ণ snapshot পাবলিক ক্যাটালগে যোগ করা হয়নি।
- বর্তমান mature `PaperPreview` renderer ব্যবহার করে saved paper size/orientation/font, header, mixed MCQ/CQ/SHORT sections, saved edits, exclusions, division groups এবং deterministic set shuffle দেখানো হয়। A4 নির্বাচিত থাকলে A4; পুরোনো ভিন্ন মাপ জোর করে A4-এ রূপান্তর করা হয়নি।
- Snapshot প্রশ্ন থেকেই display model হয়; প্রশ্নব্যাংক পুনরায় query করে কপি বদলানো হয় না। CQ-তে Bengali এবং nested sub-question keys সমর্থিত।
- Renderer-এ opt-in readOnly mode; ব্যক্তিগত reviewer-তে question actions ও image resize controls নেই। মূল builder-এর editable mode আগের মতোই আছে।
- Preview route checksum/settings/question shape যাচাই করে ব্যর্থ হলে সতর্কতা দেখায়। APPROVED সিদ্ধান্তে server-side renderability check; invalid/empty বা সব প্রশ্ন বাদ দেওয়া কপি অনুমোদন হবে না, তবে সংশোধনের অনুরোধ করা যাবে।
- এটি reviewer preview; buyer institution-name-only print, public sample, PDF assembly snapshot ও payment এখনও বাস্তবায়িত নয়।

### চতুর্থ ধাপের যাচাই

- Typecheck এবং ৩৭৩টি automated test সফল।
- mixed sections, Bengali CQ, saved edits/exclusions/fonts, immutable inputs, seeded sets, invalid/empty approval rejection এবং private-route guards-এর regression tests।
- বাস্তব preview component-এর Chromium fixture-এ 320/390/768/1280px প্রস্থে ৪টি rendered sheet, page overflow নেই, sheet-এ editing buttons নেই এবং JavaScript error নেই। Fixture synthetic snapshot ব্যবহার করে; authenticated production browser, বাস্তব ফোন বা physical print test নয়।
- Browser fixture ও dependencies `/home/user/market-preview-browser`-এ scratch হিসেবে রাখা; repository-তে generated bundle বা Chromium যোগ করা হয়নি।

## পঞ্চম ধাপ: নতুন বিষয়ভিত্তিক হোমপেজ ও দ্বাদশ শ্রেণি

এই ধাপটি ব্যবহারকারীর নতুন হোমপেজ নির্দেশ অনুযায়ী পূর্বের হোমপেজ পরিকল্পনাকে প্রতিস্থাপন করে।

- হোমপেজের পুরোনো creation cards, live demo, statistics, packages, starter ও guide আর mount করা হয় না। Shared site header/footer অপরিবর্তিত; শিক্ষক প্রোফাইলের দুই creation path বজায় আছে।
- একদম ওপরে ষষ্ঠ–দ্বাদশ শ্রেণির scrollable মেনু। Default ষষ্ঠ শ্রেণি। শ্রেণি বদল URL-এ থাকে এবং reload/share করা যায়।
- নির্বাচিত শ্রেণির প্রতিটি বিদ্যমান curriculum subject আলাদা বিভাগ; প্রতি বিষয়ে সর্বোচ্চ ৬টি প্রকৃত অনুমোদিত পরিচিতি। প্রশ্ন না থাকলে সৎ empty state, database failure হলে আলাদা unavailable message।
- A4 অনুপাতের পরিচিতি কার্ড: subject, title, exam type, class, chapters, price ও seller-profile link। এটি মূল প্রশ্নপত্রের preview নয়—কার্ড ও পাতায় স্পষ্ট বলা আছে; কোনো fake প্রশ্ন/thumbnail নেই।
- প্রতি বিষয়ের “আরও প্রশ্ন দেখুন” grade/subject বহন করে marketplace-এ যায়। সেখানে subject/grade বদলালে chapter নির্বাচন reset হয় এবং নতুন তালিকা client-side বদলায়।
- একই curriculum helper ব্যবহার করে class 10-এ existing class 9 বই এবং class 11/12-এ existing combined 11–12 বই দেখানো হয়। নতুন/সংশোধিত official syllabus যোগ করা হয়েছে বলে দাবি করা হয়নি।
- Teacher sale form-এ দ্বাদশ শ্রেণি, canonical subject dropdown ও chapter checkboxes; server metadata schema-তেও class 12 গ্রহণ। পুরোনো free-text metadata পরিবর্তন করা হয়নি; এমন বিষয় class-এর “সব প্রশ্নপত্র” ক্যাটালগে খুঁজতে হবে।
- Catalog-এর নতুন query grade/subject/exam predicates দিয়ে source narrow করে, then exact approved public projection এবং chapter filter দিয়ে matching records paginate করে। প্রতি response সর্বোচ্চ ২৪ card; সর্বোচ্চ ১,০০০ candidate scan-এর পরে continuation link। Full normalized/indexed database listing এখনও বাকি; string predicates বর্তমান server-generated compact JSON storage অনুযায়ী।
- Homepage-এ প্রতি subject সর্বোচ্চ ৬ card query; একই সময়ে সর্বোচ্চ ৪ query চালিয়ে connection pressure সীমিত। Heavy traffic-এর জন্য normalized listing/index/cache এখনও প্রয়োজন।
- পুরোনো `/#start` dashboard/workspace link সরাসরি `/question-builder`-এ বদলানো হয়েছে। অন্য পুরোনো feature routes মুছে দেওয়া হয়নি।

### পঞ্চম ধাপের যাচাই

- Typecheck ও ৩৭৭টি automated test সফল। পুরোনো homepage placement-এর test নতুন নির্দেশ অনুযায়ী আপডেট; পুরোনো component unit tests বজায়।
- Chromium actual-home/component fixture: 320/390/768/1440px-এ page overflow নেই; ৭ class link, প্রতি বিষয় ৬ card, A4 ratio, class 12 navigation এবং more-link state যাচাই।
- Interactive filter fixture-এ subject অনুযায়ী chapter options এবং grade/subject পরিবর্তনে stale selection reset যাচাই; JavaScript error নেই।
- Fixture-এ synthetic approved metadata ব্যবহার করা হয়েছে। Authenticated production, real mobile/print বা payment E2E নয়।
- Main app-এর login backdrop-ও homepage reuse করে; optional searchParams দিয়ে compatibility রাখা হয়েছে।

### এখনও বাকি

PDF assembled-paper provenance; source-separated wallet ledger and migration of all debit paths; atomic marketplace purchase and 60/40 sharing; protected sample/buyer institution-only print; Send Money; withdrawal/refund/reporting; full site branding and domain login/payment verification; production/authenticated E2E। এই ধাপে কোনো টাকা কাটা, transfer বা withdrawal চালু করা হয়নি।

## ষষ্ঠ ধাপ: উৎসভিত্তিক ব্যালেন্স ও durable ledger

- Wallet version 2-এ bonus, recharge, earnings এবং received আলাদা integer-paisa balance। সমষ্টি total balance-এর সঙ্গে না মিললে fail closed।
- পুরোনো total অপরিবর্তিত থাকে। পুরোনো bonus field historical grant হওয়ায় অবশিষ্ট bonus নিখুঁতভাবে জানা যায় না; সর্বোচ্চ সেই grant পর্যন্ত bonus হিসেবে conservatively reserve, বাকিটা recharge হিসেবে ধরা হয়। পুরোনো balance থেকে কোনো earnings/withdrawable income বানানো হয় না। UI-তে সীমাটি বলা আছে।
- নতুন wallet-এ ৳২০ একবারের bonus source শুরু হয়। পুরোনো wallet শুধু পড়লে persisted bulk migration হয় না; প্রথম পরিবর্তনে version 2 লেখা হয়।
- প্রতিটি নতুন mutation-এ opening balance/source checkpoint, unique operation receipt, source breakdown, before/after balance এবং chronological history রাখা হয়। ভুল বা পুনর্ব্যবহৃত operation ID থেকে দ্বিগুণ debit/credit বন্ধ।
- ডাটাবেজ question checkout, PDF checkout, Ready monthly plan এবং admin recharge একই audited source-aware helper ব্যবহার করে। সরাসরি total-only overwrite সরানো হয়েছে।
- তৈরির/কেনার খরচে আগে bonus, তারপর recharge, received, শেষে earnings কাটে। Send Money-তে bonus ব্যবহার হয় না।
- ওয়ালেটে উৎসভিত্তিক হিসাব ও সর্বশেষ ৫০টি নতুন ledger transaction দেখায়; পুরোনো receipt/history অক্ষুণ্ণ।
- Production-এ bulk rewrite, database provider change বা schema migration করা হয়নি।

## সপ্তম ধাপ: TID Send Money

- `/wallet/send`: authenticated non-admin ব্যবহারকারীর জন্য প্রাপক TID ও পরিমাণ দিয়ে name confirmation; dashboard/wallet থেকে link। Google-এ নিবন্ধিত STUDENT-role অ্যাকাউন্টও আগের সিদ্ধান্ত অনুযায়ী সুবিধা পায়।
- আগে server-generated private quote; নাম, TID, amount ও fee স্পষ্ট দেখে checkbox দিয়ে নিশ্চিত করার পরই transfer। Quote ১০ মিনিট কার্যকর, sender-এর সঙ্গে bound। Client পাঠানো recipient/amount বিশ্বাস করে debit করা হয় না।
- global advisory transaction lock-এর মধ্যে sender debit, recipient received-credit, দুই ledger/history, daily counter এবং completion commit হয়। কোনো ধাপ ব্যর্থ হলে সব rollback। Concurrent retry-এ একবারই টাকা যায়।
- bonus-only/self/unknown/admin/expired/cross-user/unauthenticated request প্রত্যাখ্যান। Recipient identity ও fresh account role যাচাই।
- প্রাপ্ত টাকা re-transfer করলেও earnings হয় না; উত্তোলনযোগ্য হয় না।
- প্রাথমিক প্রকাশ্য limits: ৳১ minimum, দৈনিক ৳৫,০০০ maximum, fee ৳০, দিনে সর্বোচ্চ ৩০ recipient lookup। এগুলো conservative code constants; admin-configurable settings এখনও নয়।
- এটি বাস্তব balance transfer; marketplace purchase ও earnings generation এখনও চালু নয়। Withdraw endpoint/button তৈরি করা হয়নি।

### ষষ্ঠ/সপ্তম ধাপের যাচাই

- Typecheck ও ৩৮৭টি automated test সফল। Source allocation, invalid balances, bonus restrictions, operation replay, unauthorized/expired quotes, parallel retries, recipient failure rollback, daily cap/lookup quota এবং received re-transfer tests আছে।
- অতিরিক্ত বাস্তব disposable PostgreSQL 18 + Prisma adapter integration সফল: concurrent bonus once; source-aware admin recharge; recipient history write-এ forced failure হলে দুই wallet/ledger rollback; আট concurrent confirmation-এ একবার credit; পুনরায় পাঠিয়েও received থেকে earnings না হওয়া।
- Opt-in script: `scripts/wallet-transfer-postgres-check.cjs`। কেবল স্পষ্টভাবে দেওয়া localhost:5439 disposable URL গ্রহণ করে; production `DATABASE_URL` পড়ে না। Generated engineType-client Prisma path ও adapter path আলাদাভাবে দিতে হয়।
- Integration fixture-এর cluster/data/dependencies `/home/user/funds-db`-এ, repository-তে binary/data যোগ হয়নি। Production user balance বা real bKash transfer দিয়ে পরীক্ষা হয়নি। Authenticated production browser test-ও বাকি।
- পুরোনো app version-এ rollback করলে version-2 fields উপেক্ষা করে balance overwrite হতে পারে। Financial rollback প্রয়োজন হলে নতুন transfer entry বন্ধ করে source checkpoint/ledger reconcile করে compatible code deploy করতে হবে; অন্ধভাবে পুরোনো total-only writer ফিরিয়ে দেওয়া নিরাপদ নয়।

### অবশিষ্ট মূল কাজ

PDF assembled-paper provenance; protected samples ও buyer institution-name-only print; atomic marketplace purchase ও 60/40 earnings; minimum ৳১০০ earnings withdrawal ও manual bKash reconciliation; refunds/complaints/admin reports; configurable limits; site-wide rebrand/domain auth/payment verification; authenticated/mobile/payment end-to-end tests।

## অষ্টম ধাপ: বিক্রির আয় থেকে manual bKash withdrawal

- `/wallet/withdraw`: authenticated non-admin account-এর অবশিষ্ট `earnings` থেকেই ন্যূনতম ৳১০০, সর্বোচ্চ ৳৫০,০০০ অনুরোধ। নিজের bKash নম্বর ও explicit confirmation আবশ্যক। অন্য source ব্যবহার হয় না। মার্কেটপ্লেস earnings generation এখনও চালু নয়; কোনো production test earnings যোগ হয়নি।
- অনুরোধে earnings-only ledger debit এবং HELD record একই advisory-locked transaction-এ। হোল্ডে থাকা টাকা create/buy/send-এ আবার খরচ হয় না। এক account-এর এক pending request। Stable request ID duplicate debit বন্ধ করে।
- `/admin/withdrawals`: admin-only pending queue ও PAID/REJECTED audit views। বাইরের manual payout-এর explicit confirmation ও unique case-normalized TrxID ছাড়া PAID নয়। এটি টাকা পাঠানোর API নয়। বাতিলের কারণ আবশ্যক, earnings-only release হয় একবার। নিষ্পত্তির পরে conflicting decision প্রত্যাখ্যান।
- UI-তে minimum, eligible source, fee ৳০, external cash-out fee বাদ থাকা ও guaranteed settlement time না থাকার disclosure। Wallet থেকে withdrawal এবং admin dashboard থেকে queue link।
- Automated tests ৩৯২টি ও typecheck সফল। Permissions, non-earnings rejection, minimum/invalid input, consent, concurrent duplicates, one pending, unique payout TrxID, conflicting review, rollback এবং release-once tests।
- Disposable PostgreSQL integration-ও সফল: forced withdrawal record failure-এ hold rollback, ৮ concurrent requests-এ একবার hold, reject retry-এ একবার earnings release। আগের source-ledger/Send Money integration-ও আবার সফল। Script extended: `scripts/wallet-transfer-postgres-check.cjs`।
- বাস্তব payout/production wallet mutation দিয়ে পরীক্ষা নয়; authenticated production browser/mobile E2E হয়নি। একাধিক admin বাইরের bKash-এ একই request-এ একসঙ্গে টাকা পাঠানো সফটওয়্যার transaction দিয়ে ঠেকানো যায় না—manual coordination অপরিহার্য এবং UI-তে সতর্কতা আছে। ভবিষ্যৎ provider integration বা admin payout claim/assignment দরকার।
- অবশিষ্ট: marketplace atomic purchase/60–40 ও locked buyer library/print, PDF paper provenance/sale, protected sample, refunds/reporting, full rebrand/domain auth/payment callback verification। Original plan অপরিবর্তিত।

## নবম ধাপ: মার্কেটপ্লেস কেনাকাটা, ৬০/৪০ ও ক্রেতার স্থির লাইব্রেরি

- অনুমোদিত database-paper detail-এ explicit price confirmation। Confirmed terms hash paper ID, owner, revision, immutable snapshot hash, price এবং title-এর সঙ্গে bound। বদলানো মূল্য/কপি পুরোনো confirmation দিয়ে কেনা যায় না। Server নতুন করে approval, metadata ও renderability/hash যাচাই করে।
- Authenticated non-admin buyer নিজের paper কিনতে পারেন না। Non-admin seller account server-এ যাচাই। এক buyer/paper-এর durable unique purchase record; একই request concurrent/repeated হলেও একবার debit/earnings credit। ইতিমধ্যে কেনা হলে listing সরালেও repeat action নতুন চার্জ করে না।
- একই global wallet advisory transaction-এ buyer source-aware debit, seller earnings credit, independent frozen buyer snapshot এবং platform receipt তৈরি। Seller ৬০% integer paisa floor; বাকি platform ৪০% plus fractional-paisa remainder। উদাহরণ ৳১০.০১ → seller ৳৬.০০, platform ৳৪.০১। Creation charge আলাদাই থাকে; seller listing price-এর অংশ নয়।
- Seller আয় wallet earnings-এ আসায় create/buy/send এবং existing minimum ৳১০০ withdrawal-এ ব্যবহারযোগ্য। Bonus/recharge/received source rules আগের মতো; withdrawn/held earnings spend হয় না।
- `/dashboard/library` owner-scoped paginated purchased list; `/dashboard/library/[id]` session buyer-only immutable copy। Listing পরে বদলানো/সরানো হলেও নিজের stored copy খোলা যায়। আবার খোলা/প্রিন্টে চার্জ নেই।
- Buyer form শুধু ২–২০০ অক্ষরের single-line institution name গ্রহণ করে। Client থেকে snapshot/amount/settings পরিবর্তন পাঠালেও সেগুলো নেওয়া হয় না। Snapshot/hash অপরিবর্তিত; rendering-এ শুধু পুরোনো institute field override। Questions/editing handles অনুপস্থিত, source layout/font বজায় রেখে browser print। Saved institution ব্যবহার হয়; unsaved input নয়।
- Buy form-এ price, rounding, restricted editing, no bought-copy resale, no automatic refund এবং digital-copy redistribution পুরোপুরি আটকানোর প্রযুক্তিগত সীমা বলা আছে। পূর্ণ প্রশ্নপত্রের pre-purchase sample এখনও pending এবং তা পরিষ্কার বলা আছে। Public page-এ snapshot দেওয়া হয়নি।
- Catalog/admin/withdrawal-এর আগের checkout-not-enabled লেখা সংশোধন। Profile-এ purchased library link।

### নবম ধাপের যাচাই ও সীমাবদ্ধতা

- Typecheck এবং ৩৯৭ tests pass: split conservation, ৮ concurrent purchase retries, invalid/auth/self/admin/price-change/approval/hash checks, insufficient funds, seller/history/copy/platform write-failure rollback, immutable owner-only institution changes।
- Extended disposable PostgreSQL script pass: forced final platform-receipt insert failure হলে buyer/seller/copy rollback; আট retries-এ একবার purchase; exact 600/401 paisa allocation; institution edit snapshot অপরিবর্তিত। আগের withdrawal/Send Money integration-ও পুনরায় pass। Production money ব্যবহার হয়নি।
- Synthetic Chromium 320/390/768/1440: no horizontal overflow, purchased institution rendered, no editable paper controls, print hides form/buttons, PDF generated। Fixture/action mock; authenticated production checkout/mobile/printer E2E নয়। Scratch files `/home/user/purchase-browser`-এ, Git-এ binary/PDF নেই।
- Platform receipt বর্তমানে audit record, bank/bKash settlement বা revenue-report dashboard নয়। Manual admin payout coordination caveat বহাল। No automatic refund route; refund/dispute reporting এখনও pending।
- অবশিষ্ট: নিজের PDF assembled-paper provenance ও sale, protected pre-purchase sample, refunds/disputes/admin reports, configurable financial limits, payout admin assignment, full rebrand/domain auth/payment callback verification, authenticated production end-to-end validation। Original plan unchanged।

## দশম ধাপ: কেনার আগের সীমিত জলছাপযুক্ত নমুনা

- Approved immutable database snapshot/hash/renderability যাচাইয়ের পর server-only `publicMarketSample` public allowlist তৈরি করে। Public component-এ snapshot, settings, question IDs, correct answer, explanation, option, attachment বা private URLs দেওয়া হয় না।
- স্থির deterministic excerpt selection: প্রতি পাঁচ প্রশ্নে একটি, minimum একটি/max দুটি eligible প্রশ্নের শুরু; প্রতিটি stem-এর সর্বোচ্চ অর্ধেক এবং ১৬০ Unicode character পর্যন্ত। Single-question paper-ও কখনো পুরো stem প্রকাশ করে না। Client pagination/offset/seed দিয়ে অন্য slice নেওয়ার endpoint নেই।
- HTML/resource URL/data এবং obvious inline উত্তর/সমাধান/ব্যাখ্যা লেখা stem বাদ। Detection সম্পূর্ণ নির্ভুল নয়—UI-তে সীমা বলা আছে। React escaped plain text; rich HTML/Markdown/external image rendering নয়।
- Watermarked excerpt sheet-এ এটি পূর্ণ প্রশ্ন/পৃষ্ঠা নয় বলা আছে। কোনো নিরাপদ excerpt না পেলে unavailable disclosure; fake sample নয়। Original full layout buyer copy-তে থাকে। Cards/catalog-এ নতুন sample link description।
- জলছাপ DRM নয়; screenshot/copy পুরোপুরি আটকানোর দাবি নেই। নতুন sample schema-তে source snapshot client-এ পাঠানো হয় না। Existing buyer-only full copy অপরিবর্তিত।

## একাদশ ধাপের প্রথম অংশ: admin sales receipt report

- `/admin/marketplace-revenue`: fresh DB role ADMIN যাচাইয়ের পর শুধু platform receipt prefix পড়া হয়। Purchased question snapshots/buyer institution/bKash numbers পড়া হয় না।
- ৫০টি record/page cursor pagination, stable receipt-key order। Validated allowlisted financial fields এবং TID; invalid receipts count/alert সহ totals থেকে বাদ।
- Gross sale, seller earnings ও platform share কেবল current page-এর totals বলে স্পষ্ট label। এটি lifetime totals, net profit, external settlement/cash balance report নয়। Existing withdrawal audit views-এর link।
- Immutable historical receipts listing সরালেও থাকে। Report read-only; কোনো payout/refund/balance mutation নেই। Admin dashboard link যুক্ত।

### দশম / একাদশ প্রথম অংশের যাচাই ও অবশিষ্ট

- Typecheck + ৪০৪ tests passed। New tests cover deterministic/minimum/small/300-question excerpt limits, secret-field absence, inline solution/resource suppression, unapproved/tampered/wrong identity fail-closed, report field allowlist/integer sums/invalid receipts/admin-before-query/pagination bound। পুরোনো metadata-only card safety assertions বজায় রেখে obsolete unavailable-text assertion নতুন sample wording-এ আপডেট।
- Browser/mobile/authenticated production E2E এই ধাপে করা হয়নি; production money ব্যবহার হয়নি। Report sample count/selection সম্পূর্ণ UI/financial DB E2E নয়।
- এখনও বাকি: নিজস্ব PDF assembled-paper provenance ও sale; refund/dispute flow এবং source-aware financial reversal; lifetime/date-range/settlement reconciliation reports; admin payout assignment/configurable financial limits; full rebrand/domain auth/payment callback verification; final authenticated/mobile/print/payment E2E। মূল পরিকল্পনা অপরিবর্তিত।

## দ্বাদশ ধাপ: ক্রেতার অভিযোগ ও source-preserving full refund

- কেনা কপি ও লাইব্রেরি থেকে `/dashboard/library/[id]/report`: authenticated actual buyer প্রতি purchase-এ একটি ১০–২০০০ অক্ষরের অভিযোগ জমা দিতে পারেন; existing record retry-তে overwrite হয় না। Fresh account/owned purchase validation এবং explicit terms confirmation। স্বয়ংক্রিয় রিফান্ড বা সময়সীমার নিশ্চয়তা নয়।
- `/admin/marketplace-disputes`: fresh ADMIN DB role guarded OPEN/REFUNDED/REJECTED queue; ৫০ record/page cursor pagination; কারণ, note ও audit status। সিদ্ধান্তে ১০–১০০০ অক্ষরের note আবশ্যক; refund-এর জন্য explicit checkbox। Rejected সিদ্ধান্তে টাকা/কপি বদলায় না। নিষ্পত্তি চূড়ান্ত; conflicting second decision আটকে যায়।
- Full refund মূল buyer debit ledger-এর `used` source amounts থেকে ফেরত: bonus→bonus, recharge→recharge, received→received, earnings→earnings। চারটি safe integer source sum মূল price-এর সঙ্গে মিলতে হয়। Original ledger না থাকলে বা ভুল হলে fail closed। কোনো nonwithdrawable source earnings/recharge-এ উন্নীত হয় না।
- একই wallet advisory transaction-এ seller earnings-only reversal, buyer-এর original-source credits, immutable refund receipt, purchase refundedAt এবং complaint decision commit। মূল platform sale receipt অপরিবর্তিত audit record হিসেবে থাকে; refund receipt তার platform অংশ বিপরীত সমন্বয় করে। Duplicate/concurrent approval-এ একবারই refund।
- বিক্রেতার অবশিষ্ট earnings seller share-এর চেয়ে কম হলে refund ব্যর্থ; অভিযোগ OPEN থাকে। Recharge/received/bonus বা held payout থেকে জোর করে টাকা কাটা, negative debt কিংবা invented funds নয়। এই ক্ষেত্রে বাহ্যিক সমন্বয়/তদন্ত প্রয়োজন; সেই প্রক্রিয়া এখনও স্বয়ংক্রিয় নয়।
- Refunded purchase private paper route ও institution update default validation-এ বন্ধ; library/report audit-এ status দেখা যায়, snapshot client-এ পাঠানো হয় না। একই refunded purchase checkout retry-এ charge/re-purchase হয় না। আগেই loaded/downloaded/printed copy প্রযুক্তিগতভাবে ফিরিয়ে নেওয়া যায় না; UI-তে রিফান্ডের পর ব্যবহার/বিতরণ না করার শর্ত ও সীমা বলা আছে।
- Admin sales report সংশ্লিষ্ট current-page original receipts-এর matching refunds দেখায়; gross/refund/adjusted seller-platform অংশ আলাদা। পরিচয়/পরিমাণ/date না মেলা refund alert সহ adjustments থেকে বাদ। এটি lifetime cash/settlement/net-profit report নয়।

### দ্বাদশ ধাপের যাচাই ও বাকি কাজ

- Typecheck + ৪১১ tests pass। Tests: exact mixed-source restoration, concurrent duplicate refund, buyer/admin/consent/notes checks, insufficient seller earnings, tampered source/platform receipt, final refund/copy/history/dispute failure rollback, rejection immutability, refunded private access/edit/repurchase denial, exact report matching।
- Actual disposable PostgreSQL integration pass: forced final refund-receipt insert failure rolls back both wallets, access marker and complaint; আট concurrent approvals refund once to exact original sources, seller share reversed once এবং online copy revoked। Previous purchase/withdrawal/Send Money integration পুনরায় pass। Script: `scripts/wallet-transfer-postgres-check.cjs`; only explicit disposable localhost:5439 URL; production `DATABASE_URL` পড়ে না।
- Production ব্যবহারকারীর অর্থ বা real bKash payout দিয়ে পরীক্ষা হয়নি; authenticated production/mobile browser E2E এই ধাপে হয়নি। Automatic external payout/refund API যোগ করা হয়নি।
- PDF review: existing `readyowned` records represent paid copies/selections, not sufficient proof of original assembled-paper authorship। সেগুলোকে নিজের তৈরি ধরে resale eligibility দেওয়া হয়নি। নিরাপদ PDF provenance ও protected buyer delivery এখনও আলাদা অসমাপ্ত কাজ।
- অন্যান্য অবশিষ্ট: PDF-created assembled-paper resale, insufficient-seller-funds recovery policy, payout admin assignment ও configurable limits, lifetime/date-range/settlement reports, full rebrand/domain Google login/payment callback validation, final authenticated/mobile/print/payment E2E। Original plan unchanged; এই appendix পুরোনো pending-refund status-কে supersede করে।

## ত্রয়োদশ ধাপ: উত্তোলনের একক অ্যাডমিন দায়িত্ব ও durable claim audit

- Manual bKash payout/reject-এর আগে pending HELD request নিজের দায়িত্বে নিতে হবে। Fresh DB role ADMIN, explicit confirmation, valid request এবং matching active hold ছাড়া claim হয় না। পুরোনো pending request-ও claim করতে হবে; existing paid/rejected history bulk rewrite হয়নি।
- একই financial advisory transaction lock-এ unique claim audit এবং request claimedBy/claimedAt একসঙ্গে লেখা হয়। Same-owner retry idempotent; অন্য admin claim/PAID/REJECTED করতে পারেন না। Review-তে claim owner ও independent audit-এর request identity/amount/number/timestamp মেলানো হয়। Active hold/unique payout TrxID/explicit actual-payment confirmation আগের মতো আবশ্যক।
- Claim non-expiring এবং auto-release/steal/reassignment API নেই। বাইরে টাকা পাঠানো শুরু হয়ে থাকতে পারে—তাই timeout দিয়ে অন্য admin-কে পাঠানোর অনুমতি দেওয়া বিপজ্জনক। Owner অনুপস্থিত/role হারালে manual investigation প্রয়োজন; নিরাপদ handover এখনও pending।
- Admin UI: unclaimed request-এ claim form; শুধু owner-এর settlement form; অন্য admin-কে স্পষ্ট ‘টাকা পাঠাবেন না’ সতর্কতা ও claimed identity/time। Corrupt request-এ controls না দেখিয়ে alert। Ledger hold/source amount claim-এ বদলায় না।
- Claim কোনো external payment API নয়। একই admin দুই tab থেকে বাইরে দুইবার পাঠানো বা সফটওয়্যার উপেক্ষা করে টাকা পাঠানো প্রযুক্তিগতভাবে আটকায় না; UI-তে সেই সীমা বলা আছে। Claim সফল হওয়ার আগে এবং external provider history যাচাই ছাড়া টাকা পাঠানো যাবে না।
- Typecheck ও ৪১৪ automated tests সফল: legacy claims, consent/auth/other admin/terminal restrictions, ৮ concurrent same-owner retries, no timeout theft, audit/request write-failure rollback, missing audit/hold/corrupt amount rejection এবং existing payout/refund/source rules regression।
- Actual disposable PostgreSQL integration: দুই admin-এর আট concurrent claims-এ একজনই owner; অন্য admin review blocked; owner repeat claim/rejection succeeds once। আগের purchase/refund/Send Money/withdrawal integration পুনরায় সফল। No production money/real bKash payout বা authenticated production browser E2E এই ধাপে নয়।
- অবশিষ্ট: original PDF assembled-paper provenance/resale ও protected delivery; configurable financial limits; safe payout handover; insufficient-seller refund recovery; lifetime/date-range/settlement reporting; full rebrand/domain Google login/payment callback validation; final authenticated/mobile/print/payment E2E। Original plan unchanged; পুরোনো manual coordination-only limitation আংশিক উন্নত, সম্পূর্ণ external duplicate-payment prevention দাবি নয়।

## চতুর্দশ ধাপ: admin-configurable financial limits ও revision audit

- `/admin/wallet-limits`: fresh DB ADMIN role guarded settings ও সর্বশেষ ৫০ audit records। প্রতিটি পরিবর্তনে explicit confirmation, ১০–৫০০ অক্ষরের কারণ, updatedBy/time এবং immutable before/after audit। একই financial advisory transaction-এ config ও audit commit। Stale revision reject; একসঙ্গে দুই admin পুরোনো form দিয়ে overwrite করতে পারেন না।
- Configurable: দৈনিক Send Money maximum ৳১–৳৫০,০০০; দৈনিক recipient lookup ১–১০০; প্রতি withdrawal request maximum ৳১০০–৳৫০,০০০। Hard safety ceilings server-এ; bonus/received/earnings restrictions, ৳১ send minimum, ৳১০০ withdrawal minimum, fee ৳০, এক active withdrawal ও ১০ মিনিট quote expiry অপরিবর্তিত।
- Config না থাকলে আগের defaults: ৳৫,০০০/day send, ৩০ lookups/day, ৳৫০,০০০/withdrawal। Invalid/corrupt saved config হলে নতুন Send Money/withdrawal fail closed; নীরবে বেশি permissive default-এ ফেরে না। Completed Send Money retry নতুন debit নয়; নতুন limit read করার আগেই পুরোনো completion receipt ফেরত আসে।
- Send prepare এবং confirm উভয়ে latest limits financial lock-এর মধ্যে পড়ে। পুরোনো quote দিয়েও lower current limit এড়ানো যায় না। Daily transfer/lookup counters reset নয়; দিনে ইতিমধ্যে বেশি খরচ হলে limit কমানোর পরে আর নতুন send হবে না। Bangladesh date accounting বহাল।
- Withdrawal maximum নতুন request-এর জন্য; আগে হোল্ড হওয়া withdrawal ও same-ID replay নতুন lower maximum-এর কারণে বাতিল হয় না। Existing claim/review/source rules ও manual payout audit অপরিবর্তিত।
- User send/withdraw page-এ database limits দেখানো ও form maximum সংযুক্ত। Client attribute নয়, server validation চূড়ান্ত। Old open page stale হলে server নতুন limit enforce করে। Admin dashboard link যুক্ত।
- Typecheck ও ৪২১ tests pass: defaults, corrupt config, invalid amount/lookup/revision/note/consent, non-admin rejection, ৮ concurrent stale edits-এ এক revision, immutable before/after audit, config/audit write rollback, lower-limit pending quote block, no quota reset, lower withdrawal max enforcement এবং old hold settlement।
- Actual disposable PostgreSQL integration pass: আট concurrent admin edits-এ এক accepted revision/audit; lower cap পুরোনো pending quote আটকে দেয় এবং balance অপরিবর্তিত। Previous transfer/claim/withdrawal/purchase/refund integrations pass। No production money/external payout বা authenticated production browser E2E এই ধাপে হয়নি।
- অবশিষ্ট প্রধান অংশ: original assembled PDF paper provenance/resale ও protected paid delivery; lifetime/date-range/settlement রিপোর্ট; safe payout handover ও insufficient-seller refund recovery; full rebrand/domain Google login/payment callback verification; final authenticated/mobile/print/payment E2E। Original plan unchanged।

## পঞ্চদশ ধাপ: তারিখভিত্তিক / all-record আর্থিক event report

- `/admin/financial-report`: fresh DB ADMIN-only; বাংলাদেশ সময় (+06:00) inclusive start/end দিন। দুটি date না দিলে all-record mode; ভুল/অসম্পূর্ণ/reversed date-এ কোনো misleading report নয়। Admin dashboard এবং per-page sale report থেকে link।
- Gross marketplace sale ও seller/platform split purchase event date অনুযায়ী। Refund নিজস্ব refundedAt অনুযায়ী—আগের মাসের বিক্রি এই মাসে ফেরত এলে এই মাসে negative adjusted flow বৈধ। Refund মূল immutable sale-এর identity/amount/split/date-এর সঙ্গে মিলতে হয়। Original sale records মুছে ফেলা বা gross থেকে গোপনে বাদ দেওয়া হয় না।
- Payout ও rejected-withdrawal release reviewedAt অনুযায়ী; valid paid TrxID/reviewer/date আবশ্যক। HELD ও claimed count snapshot-এর বর্তমান অবস্থা, range-filtered historical hold নয়। Payout amount ও held amount seller-share/platform-share থেকে অন্ধভাবে বাদ দিয়ে ‘নিট লাভ’ দাবি নয়।
- Server-only data helper PostgreSQL RepeatableRead transaction-এ fresh role, database transaction timestamp এবং তিন receipt-prefix scan করে—আলাদা live-query snapshot-এর অসামঞ্জস্য নয়। Purchased snapshots, question bodies, wallet balances/credentials পড়া হয় না। Read-only: আর্থিক writer পরিবর্তন হয়নি।
- Per-prefix ১০,০০০ records safety bound (+১ sentinel); এর বেশি বা কোনো malformed/unmatched/backdated financial record থাকলে `complete:false`, prominent incomplete alert এবং excluded-record counters। Scan-bound ছাড়ালে lifetime/date-range final total দাবি করা হয় না; scalable persistent aggregation এখনও future work।
- UI-তে স্পষ্ট: রিচার্জ/তৈরির চার্জ/Send Money/all-wallet-liabilities/bank statement/cash/net-profit হিসাব নয়। PAID হলো admin-recorded external payout, provider-verified settlement নয়। External statement reconciliation এখনও প্রয়োজন।
- Typecheck ও ৪২৮ tests pass। Tests: Dhaka midnight/end boundaries, invalid dates, independent sale/refund dates ও negative flow, payout/rejection date filter, current held semantics, corrupt/orphan/backdated receipts, hard bound incomplete flag, auth-before-read ও repeatable-read options।
- Actual disposable PostgreSQL integration সফল: non-admin blocked; original sale ও refund reconcile; release rejection payout হিসেবে গণনা নয়; timestamp ও complete flag সঠিক। আগের wallet/claims/limits/purchase/refund regression integration পুনরায় pass। Production money বা authenticated production/mobile browser E2E এই ধাপে হয়নি।
- অবশিষ্ট: original assembled-PDF paper provenance/resale এবং protected paid delivery; bank/provider statement reconciliation ও scalable >১০,০০০ event aggregation; safe payout handover/insufficient-seller refund recovery; full rebrand/domain Google login/payment callback validation; final authenticated/mobile/print/payment E2E। মূল পরিকল্পনা অপরিবর্তিত।

## ষোড়শ ধাপ: shared shell / PWA / metadata-তে প্রশ্নবুক পরিচয়

- Shared `lib/brand.ts`: বাংলা প্রশ্নবুক.কম, English Proshnobook, domain proshnobook.com ও Bengali tagline। Header/footer, শিক্ষক workspace, wordmark, compact logo, optional intro, navigation drawer/legacy navbar, processing popup ও install prompt shared identity ব্যবহার করে। Bengali wordmark/intro-তে Kalpurush UI font/fallback, স্বাভাবিক letter spacing ও line height; existing navy/violet/teal design unchanged।
- `getSite`-এ known saved legacy name/tagline aliases শুধু display-তে normalize হয়; database settings rewrite নয়। Custom admin names, footer/social/contact data অক্ষুণ্ণ। No invented support@proshnobook email বা phone।
- PWA name/short_name/description ও app metadata defaults নতুন পরিচয়ে। Install app ID/start_url/scope, storage snooze key এবং generic icon asset paths অপরিবর্তিত—installed identity বা persisted preferences reset নয়। Existing account, cookies, TID, ledger, receipts, saved paper settings/header এ কোনো পরিবর্তন নেই।
- RSS নতুন brand title/description; sitemap/robots/layout/feed একটি sanitized operational origin helper ব্যবহার করে। Missing/invalid config-এ আগের QuestionMaker Vercel origin; no localhost/SaifulSir fallback। Valid explicit SITE_URL override retained।
- Canonical host switch, redirect, AUTH_URL, Google OAuth credentials/callbacks, payment endpoints বা Vercel environment পরিবর্তন করা হয়নি। Custom domain login/callback verification ছাড়া old address সরানো হয়নি। Display brand change নিজে OAuth verification নয়।
- Auto-generated share caption hashtag/footer ও admin post search-preview label নতুন নাম; generic icon filenames/internal qm/proshnoday CSS/module names ও repository/package/storage identity rename নয়।
- Typecheck ও ৪৩২ automated tests pass: actual rendered wordmark/logo/intro, manifest values, read-only saved alias normalization, contact preservation, operational URL sanitization/fallback, existing footer navigation ও truthful processing-progress checks বজায়।
- Synthetic Chromium 320/390/768/1440: actual header/wordmark/logo/intro নতুন বাংলা নাম, no old brand text, no horizontal overflow, reduced-motion rendering, no browser exceptions। Navigation/theme mocked; authenticated production OAuth/mobile phone E2E নয়। Scratch `/home/user/rebrand-browser`, binaries outside Git।
- এটি core-shell rebrand, সম্পূর্ণ historical/legal-content migration নয়। Imported/personal legacy policy/about/contact/educational page content ও কিছু পুরোনো outbound URL এখনও review দরকার; contact channels যাচাই না করে নতুন support endpoint বানানো হয়নি। নতুন legal/privacy/refund terms-এর পূর্ণ review আলাদা pending।
- অবশিষ্ট প্রধান কাজ: original assembled-PDF provenance/resale/protected paid delivery; historical/legal page identity/content review; domain Google login/payment callback checks ও canonical migration; safe payout handover/refund recovery ও provider reconciliation/scalable financial aggregation; final authenticated/mobile/print/payment E2E। Original plan unchanged।

## Phase 17 — Current marketplace information and policy pages (2026-11-10)

- Replaced obsolete SaifulSir/free-service/legal-assurance copy on about, privacy, terms, contact, disclaimer and copyright pages with Bengali Proshnobook information matching current marketplace/source-aware wallet behavior.
- Shared accessible policy navigation and fixed revision date; added cookie/local-storage guidance. Old privacy-policy/terms-conditions/dmca-policy URLs redirect to current local routes; /contact redirects to /contact-us.
- Contact reads existing getSite email/phone without altering settings. Validated mailto/tel targets; missing channels explicitly disclosed. No invented support inbox, payment-number-as-support, automatic message form, deletion SLA, legal-agent registration or universal compliance claim.
- Terms distinguish creation vs purchase, immutable buyer copies, own DB-paper resale vs unfinished assembled-PDF resale, source-aware refunds/insufficient seller earnings, earnings-only manual withdrawals and source restrictions. Copyright approval is not presented as proof of legal rights.
- Six rendered/redirect regression tests cover identity/navigation/date, financial limitations, privacy providers, configured/missing/unsafe contacts and aliases. No auth/callback/financial behavior changes.
- Outstanding: publish/verify real support channels in site settings (operator action); legal review by a qualified adviser; assembled-PDF provenance/protected delivery; external reconciliation and final authenticated/mobile/print/payment E2E. This phase does not complete the entire project.

## Phase 18 — Immutable PDF assembly origin foundation (2026-11-10)

- New ready-PDF checkout atomically creates a separate create-only `readyorigin:v1:<owner>:<receipt>` manifest and binds its SHA-256 digest to the receipt. Server derives source/classification from the canonical ready record, not browser claims; initial selected order, effective edits/header and source metadata/URL are retained independently of mutable draft edits.
- Uploaded-source assemblies remain explicitly classified `UPLOADED_SOURCE`; library assemblies are `LIBRARY_ASSEMBLY`. Both have `resaleAuthorized: false`. This is evidence of a server checkout, not legal authorship/copyright, PDF byte integrity or permission to resell. No marketplace PDF resale endpoint enabled.
- Owner-only origin lookup verifies receipt binding, source ID and manifest digest; corrupted/missing new origins fail closed. Legacy receipts are explicitly unverified, are not backfilled from today's source and remain reusable without new origin charges.
- New saved assemblies load their archived source record, so later library source URL/metadata replacement or archival does not silently change them. Browser checkout sends its displayed source URL; a mismatch with the current source blocks a new selection/charge and asks the user to reopen Library. Original storage objects must still exist; source bytes are NOT copied/hashed or protected by this phase.
- Saved library explains origin status without implying resale rights. Authentication, existing payment prices and source-aware financial behavior preserved.
- Validation: typecheck; 446/446 security/regression tests. Eight new action tests cover atomic rollback, ignored browser origin claims, draft/source mutation isolation, upload classification, owner scoping, corruption/missing/legacy behavior, eight concurrent retries (mock-serialized transaction) and stale-source no-charge. No production real-money or real PostgreSQL E2E claimed for this phase.
- Remaining PDF work: immutable final assembled output/version submission, provenance-aware moderation, private storage/authenticated bounded delivery with no public paid URL leak, institution-only purchased render/print, previews/refund integration and authenticated browser/real-DB verification. Public Blob source URLs are not DRM or secure paid storage. External statement reconciliation, payout handover/insufficient-earnings recovery and final mobile/print/payment E2E also remain. Do not mark entire plan complete.

## Phase 19 — Encrypted selected-source checkpoints and authenticated delivery (2026-11-10)

- Added opt-in server-generated source checkpoints for new ready-PDF receipts with valid immutable origins. Client supplies receipt ID only; no arbitrary final PDF upload, source URL or resale claim accepted. Selected original pages are copied server-side in initial checkout order; this deliberately excludes edited headers/crops/answers and is not a finished assembled export.
- AES-256-GCM with randomized nonce and owner/receipt/origin/digest/key-ID authenticated binding. Existing Blob holds ciphertext only; immutable private manifests hold URL, source/output digests and limits. Owner-only download decrypts and integrity-checks server-side with final authorization recheck; no public redirect, provider URL, plaintext fallback or ADMIN bypass. Legacy public sources/other download routes remain unchanged, not retroactively private.
- Keyring supports keeping old decrypt keys while changing active key. Feature off by default until server-only PDF_VAULT_KEYS/ACTIVE_KEY and Blob configuration are securely provisioned and runtime verified. No production secrets, payment/auth settings or financial behavior modified. Saved-library control hidden when config absent/invalid.
- Provider work outside DB financial lock, owner/day attempt cap 10, source 10MB/100 pages, selection 1–10, output 3MB, streaming byte caps/no redirects/20s deadlines. Idempotent create-only manifest; concurrent losers/failed writes clean encrypted uploads best-effort. Original paid receipt/draft stays intact on any failure.
- Added operator/security/rollout guide: PDF-VAULT-OPERATIONS.md. Explicitly not DRM, a complete PDF sanitizer, proof of copyright, marketplace resale integration or a migration of existing public paid URLs. Parsing arbitrary PDFs is not a CPU sandbox; orphan ciphertext cleanup remains an operator concern.
- Validation: typecheck and 461/461 security/regression tests passed (15 new tests using actual AES-GCM/pdf-lib, mocked storage/auth/network/serialized DB). Covers selection/order/annotation removal, ciphertext integrity/binding/key rotation, unsafe URLs/bounded reads, duplicate capture cleanup/rollback, owner/legacy/refund/origin checks, final revocation during fetch, generic route/action failures, limits and rendered UI scope. Production Blob/key/real-DB/mobile capture E2E not yet performed; feature not declared production-enabled.
- Verified prior PR116 production exact SHA bebfaa76aaf285405773824be845228fdeaf2666: deployment dpl_5cRAZxUGfHGnmpTHg4sQjybAzGNo READY/PROMOTED via Vercel. PR115 also READY/PROMOTED (dpl_HToxzmEzXqXKETyVNdoHhHnB5inS).
- Next: provision/test isolated preview keys+storage safely; final assembled immutable render/export, provenance-aware seller moderation and PDF purchase/refund integration. Other remaining work: external statement reconciliation/report scaling; payout handover/insufficient-seller recovery; real support channels/legal review; authenticated end-to-end/mobile/A4 testing. Entire project remains in progress.

## Phase 20 — Financial report batched full scan (2026-11-10)

- Replaced the production loader's first-10000-per-prefix aggregation with 500-row keyset batches in one repeatable-read transaction. All sale/refund/withdrawal events are scanned without accumulating complete source arrays; refund batches fetch at most 500 corresponding immutable platform receipts, including sales outside the date range/earlier scan batches. No buyer question snapshots or wallet rows read.
- Preserved independent sale/refund/payout event dates, Dhaka date boundaries, current holds independent of selected dates, validation of receipt matching and invalid-record/incomplete warnings. Existing pure bounded-report helper remains bounded for standalone callers; the new production streaming reducer uses it only on small batches.
- Integer-safe accumulation, strictly advancing cursors, bounded lookup validation and fail-closed query/timeout handling. A failed scan returns no partial successful total. Snapshot transaction timeout is 60 seconds; this removes the fixed 10000 cutoff, not infinite-runtime limits. Very large datasets may still need materialized/indexed event aggregation or offline jobs; this is not provider statement reconciliation or cash/net-profit/liability accounting.
- Updated admin report copy and execution budget. Added four tests: 10007 sales plus 10007 matching refunds without truncation, parity with established date/corruption/current-hold rules, mid-scan query failure and malformed cursor/batch/lookup rejection. Existing loader tests retain fresh admin enforcement, repeatable-read and common timestamp checks.
- Validation: typecheck, diff check, 465/465 security/regression tests passed. New scan tests use deterministic readers; no production financial data or payment flow modified, no real production-money E2E claimed.
- Remaining: securely provision/verify PDF vault configuration; final assembled PDF and resale integration; payout handover/insufficient-seller refund recovery; external reconciliation and full liabilities/cash/profit reports; support channels/legal review; authenticated mobile/print/real-DB end-to-end checks. Entire project remains in progress.
