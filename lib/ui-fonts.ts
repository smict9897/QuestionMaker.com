import localFont from "next/font/local";

// UI only: original qk/paper families remain separate for A4 layout fidelity.
export const uiBangla = localFont({
  src: "../public/fonts/Kalpurush.woff2",
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--qm-bangla",
  declarations: [
    { prop: "unicode-range", value: "U+0980-09FF,U+200C-200D,U+0964-0965" },
  ],
});
export const uiLatin = localFont({
  src: "../public/fonts/Montserrat[wght].woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  variable: "--qm-latin",
});
