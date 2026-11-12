# Local, paid-studio-only OCR assets

No external CDN or hosted OCR request is required. These files are deliberately vendored so workers, WASM code and Bengali/English data are served from this application's own origin. They are not imported/downloaded by library/search pages.

- `worker.min.js` and its notice: `tesseract.js@6.0.1`, Apache-2.0, npm package. Main JS API is lazy-bundled from the locked dependency.
- `tesseract-core-{simd-,}lstm.wasm.js`: `tesseract.js-core@6.1.2` from npm (embedded WASM builds, Apache-2.0; LICENSE included). OEM1/LSTM only; both SIMD and non-SIMD provided.
- `ben.traineddata.gz`, `eng.traineddata.gz`: `4.0.0_best_int` files from npm `@tesseract.js-data/ben@1.0.0` and `@tesseract.js-data/eng@1.0.0`; Tesseract tessdata trained models, Apache-2.0. Bengali/English LSTM data, not an accuracy guarantee.

Reproduce: `npm ci --ignore-scripts`; copy worker+notice from `node_modules/tesseract.js/dist`, core files+license from `node_modules/tesseract.js-core`. `npm pack @tesseract.js-data/ben@1.0.0` / `@tesseract.js-data/eng@1.0.0` outside repository; extract `package/4.0.0_best_int/{ben,eng}.traineddata.gz`. Do not commit package tarballs or generated test PDFs. Check SHA256SUMS after copying. Update these assets together with the API dependency when upgrading; test actual browsers.
