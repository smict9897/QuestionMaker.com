import { Anek_Bangla, Hind_Siliguri } from "next/font/google";

// নতুন হোমপেজ ও ড্যাশবোর্ডের ফন্ট। প্রশ্নপত্র ছাপার ফন্ট (AdorshoLipi, Tinos) আগের মতোই থাকবে।
export const qkHead = Anek_Bangla({
  subsets: ["bengali", "latin"],
  display: "swap",
  variable: "--qk-head",
});

export const qkBody = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--qk-body",
});

// ===== ফাইল শেষ =====
