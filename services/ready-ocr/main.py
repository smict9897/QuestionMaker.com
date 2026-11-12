"""Private single-page Bengali/English OCR. No question answering or external AI."""
import asyncio
import hmac
import io
import os
import threading
import fitz
import pytesseract
from PIL import Image
from fastapi import FastAPI, Request, HTTPException

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
slot = threading.Lock()
MAX_BYTES = 10_000_000


def read_page(data: bytes):
    # Keep the slot held until actual OCR stops, even if client disconnects.
    if not slot.acquire(blocking=False):
        raise HTTPException(429, "OCR busy")
    try:
        with fitz.open(stream=data, filetype="pdf") as doc:
            if doc.is_encrypted or len(doc) != 1:
                raise HTTPException(400, "Expected one unencrypted page")
            page = doc[0]
            if not 1 <= page.rect.width <= 3000 or not 1 <= page.rect.height <= 3000:
                raise HTTPException(400, "Invalid dimensions")
            scale = min(2.5, (8_000_000 / (page.rect.width * page.rect.height)) ** 0.5)
            pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            image = Image.open(io.BytesIO(pix.tobytes("png")))
            words = pytesseract.image_to_data(image, lang="ben+eng", config="--psm 3", output_type=pytesseract.Output.DICT, timeout=45)
        lines = []
        line = []
        previous = None
        scores = []
        weak = 0
        for i, raw in enumerate(words["text"]):
            text = raw.strip()
            if not text:
                continue
            score = float(words["conf"][i])
            key = (words["block_num"][i], words["par_num"][i], words["line_num"][i])
            if previous is not None and key != previous:
                lines.append(" ".join(line))
                line = []
            previous = key
            scores.append(max(0, score))
            if score < 80:
                weak += 1
                text = "[UNCLEAR]"  # Do not send corrupt tokens as trustworthy facts.
            line.append(text)
        if line:
            lines.append(" ".join(line))
        text = "\n".join(lines)
        if not text or len(text) > 60000:
            raise HTTPException(422, "Unreadable page")
        # Any low-confidence token blanks the whole page server-side: conservative by design.
        return {"text": text, "confidence": sum(scores) / len(scores), "uncertain": weak > 0}
    finally:
        slot.release()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ocr")
async def ocr(request: Request):
    token = os.environ.get("READY_OCR_TOKEN", "")
    if len(token) < 32 or not hmac.compare_digest(request.headers.get("authorization", ""), "Bearer " + token):
        raise HTTPException(401, "Unauthorized")
    if request.headers.get("content-type", "").split(";")[0] != "application/pdf":
        raise HTTPException(415, "Expected PDF")
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > MAX_BYTES:
            raise HTTPException(413, "Too large")
    try:
        return await asyncio.to_thread(read_page, bytes(data))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "OCR failed") from None
