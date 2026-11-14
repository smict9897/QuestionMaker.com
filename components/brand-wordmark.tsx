import { BRAND } from "@/lib/brand";
import "./brand-wordmark.css";

/** Compact header branding: no splash, timers or perpetual flashing. */
export default function BrandWordmark({
  name = BRAND.nameBn,
}: {
  name?: string;
}) {
  return (
    <span className="qm-wordmark">
      <span className="qm-wordmark-title">{name}</span>
      <span className="qm-wordmark-tagline">{BRAND.tagline}</span>
    </span>
  );
}
