"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, FilePlus2, Wallet, UserRound } from "lucide-react";
import "./mobile-bottom-nav.css";
export default function MobileBottomNav({
  user: _user,
}: {
  user?: { name?: string | null; role?: string | null } | null;
}) {
  const pathname = usePathname() || "/";
  const items = [
    { label: "হোম", href: "/", icon: Home, active: pathname === "/" },
    {
      label: "সংরক্ষিত",
      href: "/question-builder/saved",
      icon: FolderOpen,
      active: pathname.includes("/saved"),
    },
    {
      label: "প্রশ্ন তৈরি",
      href: "/question-builder",
      icon: FilePlus2,
      featured: true,
      active:
        pathname.startsWith("/question-builder") &&
        !pathname.includes("/saved"),
    },
    {
      label: "ওয়ালেট",
      href: "/wallet",
      icon: Wallet,
      active: pathname === "/wallet",
    },
    {
      label: "প্রোফাইল",
      href: "/dashboard",
      icon: UserRound,
      active:
        pathname === "/dashboard" ||
        pathname.startsWith("/dashboard/") ||
        pathname === "/profile",
    },
  ];
  return (
    <nav className="qm-bottom-nav" aria-label="দ্রুত নেভিগেশন" data-noprint>
      {items.map(({ label, href, icon: Icon, featured, active }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`qm-bottom-item${featured ? " qm-bottom-create" : ""}${active ? " is-active" : ""}`}
        >
          <span className="qm-bottom-icon">
            <Icon size={22} aria-hidden="true" />
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
