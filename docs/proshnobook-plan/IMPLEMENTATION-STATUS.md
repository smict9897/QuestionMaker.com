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
