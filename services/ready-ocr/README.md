# QuestionMaker private OCR service

Separate Bengali/English Tesseract OCR, no Gemini and no AI answer generation here. The Next.js app sends one purchased PDF page; only OCR text goes to DeepSeek. This container is **not deployed by Vercel**. A Docker-capable VPS/container host is required. No cloud host/account is provisioned by this patch.

## Deployment

1. Generate a random secret of at least32 characters using a password manager or `openssl rand -hex 32`. Never paste it into chat or commit it.
2. From this folder: `docker build -t questionmaker-ocr .`.
3. Inject `READY_OCR_TOKEN` via your host's secret manager/environment (same value in the OCR host and Vercel). Example with an already-exported local variable:
   `docker run --rm --name questionmaker-ocr --memory=1g --cpus=1 --pids-limit=64 --read-only --tmpfs /tmp:rw,noexec,nosuid,size=256m -e READY_OCR_TOKEN -p 127.0.0.1:8080:8080 questionmaker-ocr`
4. Put behind an HTTPS reverse proxy; limit request bodies to10MB, set proxy timeout to75s, apply rate limits and restrict network access where possible. Container binds0.0.0.0 internally; the sample publishes to loopback behind the proxy, not directly to the internet.
5. Vercel QuestionMaker project: set `READY_OCR_URL=https://YOUR_HOST/ocr`, `READY_OCR_TOKEN`, retain `DEEPSEEK_API_KEY` (Production/Preview); redeploy. Do not reuse another site's Blob or storage configuration. `/health` exposes only liveness; perform an authorized PDF request to verify actual OCR before enabling paid usage.

No PDF/OCR text is deliberately saved to disk or logged. Tesseract uses temporary files in `/tmp`; deploy without body logging/tracing. Libraries parse untrusted documents: keep packages/base images patched, run isolated non-root with memory/CPU/PID limits and restricted egress, no privileged mode or host mounts. One OCR slot per process,45s Tesseract timeout,8M pixel render cap,10MB/one-page input cap. Reverse proxy slow-upload/time limits and container isolation are required; malformed PDFs can still exhaust a renderer. Never run multiple Uvicorn workers to bypass the single-slot bound unless allocating corresponding resources.

The service intentionally does not claim perfect Bangla/math/diagram extraction. All words below80 confidence are replaced by `[UNCLEAR]`; any such word causes the web app to leave the page's answers blank. Improve/test OCR before loosening this safety rule. Ordinary pages may therefore produce many blanks. Free OCR software does not mean free hosting or free DeepSeek usage.

## Checks

`python -m venv .venv` then activate it; `pip install -r requirements.txt httpx==0.28.1`; `python -m unittest discover -s . -p 'test_*.py' -v`.

Tests exercise real PyMuPDF rendering, auth, malformed/multipage rejection, busy-slot handling, uncertain-token redaction and safe errors, but **mock Tesseract output**. Full Bengali OCR quality, Docker image build, hosted HTTPS connectivity and live DeepSeek answers must be tested separately; none is implied by these checks.
