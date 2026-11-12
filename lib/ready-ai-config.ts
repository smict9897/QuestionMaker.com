/** Server-only configuration check; no secrets are sent to the browser. */
export function readyAIConfigured(): boolean {
  if (
    !process.env.DEEPSEEK_API_KEY?.trim() ||
    (process.env.READY_OCR_TOKEN?.trim().length ?? 0) < 32
  )
    return false;
  try {
    const u = new URL(process.env.READY_OCR_URL || "");
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}
