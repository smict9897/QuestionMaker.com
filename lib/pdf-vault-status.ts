/** Secret-free configuration diagnostics. Never return key values, tokens or parse errors. */
export function pdfVaultStatus(
  env: Record<string, string | undefined> = process.env,
) {
  let keys: Record<string, string> | null = null;
  try {
    const value: unknown = JSON.parse(env.PDF_VAULT_KEYS || "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value);
      if (
        entries.every(
          ([id, key]) =>
            /^[a-zA-Z0-9_-]{1,40}$/.test(id) &&
            typeof key === "string" &&
            /^[a-fA-F0-9]{64}$/.test(key),
        )
      )
        keys = value as Record<string, string>;
    }
  } catch {
    /* No secret-bearing exception escapes. */
  }
  const keyringPresent = !!env.PDF_VAULT_KEYS?.trim();
  const activeId = env.PDF_VAULT_ACTIVE_KEY || "v1";
  const activeKeyPresent = !!keys && Object.hasOwn(keys, activeId);
  const blobTokenPresent = !!env.BLOB_READ_WRITE_TOKEN?.trim();
  return {
    keyringPresent,
    keyringValid: keys !== null,
    activeKeyPresent,
    blobTokenPresent,
    configured: activeKeyPresent && blobTokenPresent,
  };
}
