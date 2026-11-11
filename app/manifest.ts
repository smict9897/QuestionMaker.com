import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "QuestionMakerBd.com",
    short_name: "QuestionMakerBd",
    description:
      "নোট, প্রশ্নব্যাংক, মডেল টেস্ট আর AI কুইজ, শিক্ষার সবকিছু একসাথে।",
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
