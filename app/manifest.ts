import { BRAND } from "@/lib/brand";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${BRAND.nameEn} — ${BRAND.nameBn}`,
    short_name: BRAND.nameBn,
    description: BRAND.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0A192F",
    theme_color: "#0A192F",
    lang: "bn",
    categories: ["education"],
    icons: [
      {
        src: "/questionmaker-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/questionmaker-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/questionmaker-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
