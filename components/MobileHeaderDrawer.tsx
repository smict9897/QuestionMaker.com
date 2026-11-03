"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { NAV_ITEMS, type NavGroup, type NavNode } from "@/lib/nav-config";

type Props = {
  open: boolean;
  onClose: () => void;
  userName?: string | null;
  actions: ReactNode; // Hire Me / Dashboard / Login বাটন (হেডার থেকে আসে)
};

/* ───────── হেল্পার ───────── */
const isActiveHref = (path: string, href: string) =>
  href === "/" ? path === "/" : path === href || path.startsWith(href + "/");

const groupHasActive = (g: NavGroup, path: string): boolean =>
  g.children.some((c) => (c.type === "group" ? groupHasActive(c, path) : isActiveHref(path, c.href)));

// প্রতিটা গ্রুপের আইডি তার অবস্থান থেকে হয়: "1", "1.0", "2.0"
const childId = (parent: string, i: number) => (parent ? `${parent}.${i}` : `${i}`);
const parentOf = (id: string) => (id.includes(".") ? id.slice(0, id.lastIndexOf(".")) : "");
const isSelfOrChild = (id: string, of: string) => id === of || id.startsWith(of + ".");

// বর্তমান পেজ যে গ্রুপগুলোর ভেতরে, ড্রয়ার খুললে সেগুলো আগে থেকেই খোলা থাকবে
function activeGroupIds(nodes: NavNode[], path: string, parent = ""): string[] {
  const ids: string[] = [];
  nodes.forEach((n, i) => {
    if (n.type !== "group") return;
    const id = childId(parent, i);
    if (groupHasActive(n, path)) ids.push(id, ...activeGroupIds(n.children, path, id));
  });
  return ids;
}

const SIZE = [
  "px-4 py-3 text-base font-semibold", // লেভেল ০
  "px-3 py-2.5 text-[15px] font-medium", // লেভেল ১
  "px-3 py-2 text-sm font-medium", // লেভেল ২
];

/* ───────── রিকার্সিভ মেনু আইটেম ───────── */
type ItemProps = {
  node: NavNode;
  id: string;
  level: number;
  path: string;
  openIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
};

function NavItem({ node, id, level, path, openIds, onToggle, onClose }: ItemProps) {
  const size = SIZE[Math.min(level, 2)];

  if (node.type === "link") {
    const active = isActiveHref(path, node.href);
    return (
      <Link
        href={node.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={`block rounded-xl transition-colors ${size} ${
          active
            ? "bg-blue-50 text-royal"
            : level === 0
              ? "text-slate-800 hover:bg-slate-100"
              : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {node.label}
      </Link>
    );
  }

  const isOpen = openIds.includes(id);
  const highlighted = isOpen || groupHasActive(node, path);
  const panelId = `nav-panel-${id.replace(/\./g, "-")}`;
  const Chevron = level === 0 ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={`flex w-full items-center justify-between gap-3 rounded-xl text-left transition-colors ${size} ${
          highlighted
            ? "bg-blue-50 text-royal"
            : level === 0
              ? "text-slate-800 hover:bg-slate-100"
              : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        <span>{node.label}</span>
        <Chevron
          size={level === 0 ? 20 : 18}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-300 ${
            isOpen ? (level === 0 ? "rotate-180" : "rotate-90") : ""
          }`}
        />
      </button>

      {/* স্মুথ অ্যাকর্ডিয়ন: উচ্চতা 0fr থেকে 1fr */}
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out ${
          isOpen ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pb-1 pl-2">
            {node.children.map((child, i) => (
              <NavItem
                key={childId(id, i)}
                node={child}
                id={childId(id, i)}
                level={level + 1}
                path={path}
                openIds={openIds}
                onToggle={onToggle}
                onClose={onClose}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── মূল ড্রয়ার ───────── */
export default function MobileHeaderDrawer({ open, onClose, userName, actions }: Props) {
  const path = usePathname();
  const [openIds, setOpenIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) setOpenIds(activeGroupIds(NAV_ITEMS, path));
  }, [open, path]);

  // একই লেভেলের একটা খুললে অন্যটা বন্ধ হয়; বন্ধ করলে ভেতরের গুলোও বন্ধ
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => !isSelfOrChild(x, id));
      const siblings = prev.filter((x) => parentOf(x) === parentOf(id));
      return [...prev.filter((x) => !siblings.some((s) => isSelfOrChild(x, s))), id];
    });

  return (
    <div className="xl:hidden">
      {/* ব্যাকড্রপ */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ড্রয়ার */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85%] flex-col bg-white shadow-xl transition-[transform,visibility] duration-300 ease-out ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-3">
          <Link href="/" onClick={onClose} aria-label="SaifulSir.com home">
            <Image src="/logo.png" alt="SaifulSir.com" width={689} height={245} className="h-10 w-auto" />
          </Link>
          <button onClick={onClose} aria-label="Close menu" className="rounded-lg p-2 hover:bg-slate-100">
            <X size={22} />
          </button>
        </div>

        {/* সার্চ (আপনার সার্চ পেজের মতোই /search?q=...) */}
        <form action="/search" role="search" onSubmit={onClose} className="border-b border-slate-100 px-3 py-3">
          <label className="flex items-center gap-2.5 rounded-xl bg-slate-100 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-blue-300">
            <Search size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input
              name="q"
              type="search"
              aria-label="Search"
              placeholder="কী খুঁজতে চান?"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
            />
          </label>
        </form>

        <nav aria-label="Mobile" className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-3">
          {NAV_ITEMS.map((node, i) => (
            <NavItem
              key={childId("", i)}
              node={node}
              id={childId("", i)}
              level={0}
              path={path}
              openIds={openIds}
              onToggle={toggle}
              onClose={onClose}
            />
          ))}
        </nav>

        <div className="grid gap-2 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {userName && <p className="px-1 text-sm text-slate-500">Signed in as {userName}</p>}
          {actions}
        </div>
      </aside>
    </div>
  );
}
