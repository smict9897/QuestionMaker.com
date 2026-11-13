# Self-hosted fonts

These files are from the Google Fonts repository (`google/fonts`, `ofl/anekbangla`, `ofl/hindsiliguri`, and `ofl/tinos`), retrieved through GitHub on 2026-11-10. They are distributed under the SIL Open Font License 1.1; see each family's accompanying OFL text.

Tinos license source: googlefonts/tinos, commit 3b4482a99b80ea5fc75f187b1be3120a3f5905b3. The corresponding Google Fonts metadata is retained in tinos-METADATA.pb.

Do not remove licenses when redistributing these fonts. Application font definitions use next/font/local; no build-time Google Fonts request is needed.

## UI typography

- Kalpurush: potasiyam/Kalpurush, commit `212bef1414db954b9259f099c0fdbad5cd95a80e`, `release/Kalpurush0.258ship.ttf`. SIL OFL 1.1, retained in `kalpurush-OFL.txt`. Single regular weight; UI bold is browser-synthesized.
- Montserrat: google/fonts, commit `3e5667764ccfea32ce0c3d58a3a4756de890adc1`, `ofl/montserrat/Montserrat[wght].ttf`. SIL OFL 1.1, retained in `montserrat-OFL.txt`. Variable upright 100–900.
- Losslessly packaged as WOFF2 with fontTools/Brotli (no glyph subsetting or outline changes). UI definitions use next/font/local, swap and no font preload.
- SolaimanLipi is only an optional locally installed fallback; no unverified SolaimanLipi asset is redistributed.
- Existing Anek/Hind/Tinos/AdorshoLipi paper definitions are unchanged. Screen UI styles explicitly preserve document preview fonts and do not apply in print.

## Database paper font selection

Kalpurush is also an explicit optional paper font (`QmPaperKalpurush`); defaults and existing font keys are unchanged. This face is available in screen and print media, independently of the UI-only font variables.

NikoshBAN is not redistributed or enabled. The inspected `Shemulbd/NikoshBAN` TTF name table states CC BY-NC-ND 3.0 (`http://creativecommons.org/licenses/by-nc-nd/3.0/`), despite its repository README saying free website use. Commercial embedding permission must be established before enabling it on this paid service. No inspected Nikosh binary is stored in the repository.
