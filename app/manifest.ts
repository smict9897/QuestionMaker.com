import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SaifulSir.com",
    short_name: "SaifulSir",
    description: "নোট, প্রশ্নব্যাংক, মডেল টেস্ট আর AI কুইজ, শিক্ষার সবকিছু একসাথে।",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "bn",
    categories: ["education"],
    icons: [
      { src: "/ceo-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ceo-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/ceo-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
