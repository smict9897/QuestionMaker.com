// প্রশ্নোদয়: নির্দিষ্ট পেজে সাইটের সাধারণ হেডার, ফুটার ও নিচের বার লুকানোর গেট
"use client";

import { usePathname } from "next/navigation";

export default function PathGate({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const hide =
    path === "/" ||
    path === "/login" ||
    path === "/wallet" ||
    path === "/dashboard" ||
    path.startsWith("/dashboard/");
  if (hide) return null;
  return <>{children}</>;
}

// ===== ফাইল শেষ =====
