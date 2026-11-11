/** Safe diagnostics only: never expose provider bodies, prompts, keys or source extracts. */
export type EnglishProviderCode =
  | "STORAGE"
  | "CONFIGURATION"
  | "AUTHENTICATION"
  | "BALANCE"
  | "RATE_LIMIT"
  | "PROVIDER"
  | "TIMEOUT"
  | "TOO_LARGE"
  | "INCOMPLETE"
  | "INVALID_OUTPUT";
export class EnglishProviderError extends Error {
  constructor(
    public readonly code: EnglishProviderCode,
    public readonly rule?: string,
  ) {
    super(`English generation: ${code}`);
    this.name = "EnglishProviderError";
  }
}
export function englishProviderMessage(code: EnglishProviderCode): string {
  const messages: Record<EnglishProviderCode, string> = {
    STORAGE:
      "সম্পূর্ণ অংশ database-এ সংরক্ষণ করা যায়নি। আগে রাখা draft থাকলে আমার draft পাতায় পাবেন।",
    CONFIGURATION: "Generation সংযোগ কনফিগার করা নেই। অ্যাডমিনকে জানান।",
    AUTHENTICATION:
      "Generation provider-এর সংযোগ অনুমোদিত হচ্ছে না। অ্যাডমিনকে API configuration যাচাই করতে হবে।",
    BALANCE: "Generation provider-এর balance/billing সমস্যা। অ্যাডমিনকে জানান।",
    RATE_LIMIT:
      "Generation provider ব্যস্ত বা rate limit দিয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।",
    PROVIDER: "Generation provider-এর সংযোগ বা সার্ভারে সমস্যা হয়েছে।",
    TIMEOUT:
      "Generation নির্ধারিত সময়ের মধ্যে শেষ হয়নি। কম অংশ নির্বাচন করে চেষ্টা করতে পারেন।",
    TOO_LARGE:
      "Provider-এর output নিরাপদ আকারের সীমা ছাড়িয়েছে। অসম্পূর্ণ প্রশ্ন সেভ করা হয়নি।",
    INCOMPLETE:
      "Provider সম্পূর্ণ paper ফেরত দেয়নি। কম অংশ নির্বাচন করে চেষ্টা করতে পারেন।",
    INVALID_OUTPUT:
      "Provider-এর প্রশ্নের কাঠামো, source, topic, প্রশ্নসংখ্যা বা answer key সঠিক হয়নি। ভুল paper সেভ করা হয়নি।",
  };
  return messages[code];
}
