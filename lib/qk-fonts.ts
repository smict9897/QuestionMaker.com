import localFont from "next/font/local";

// Self-hosted fonts: builds never depend on Google Fonts network availability.
export const qkHead = localFont({
  src: "../public/fonts/AnekBangla[wdth,wght].ttf",
  weight: "100 800",
  display: "swap",
  variable: "--qk-head",
});

export const qkBody = localFont({
  src: [
    { path: "../public/fonts/HindSiliguri-Regular.ttf", weight: "400" },
    { path: "../public/fonts/HindSiliguri-Medium.ttf", weight: "500" },
    { path: "../public/fonts/HindSiliguri-SemiBold.ttf", weight: "600" },
  ],
  display: "swap",
  variable: "--qk-body",
});
