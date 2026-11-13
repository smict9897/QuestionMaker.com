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
