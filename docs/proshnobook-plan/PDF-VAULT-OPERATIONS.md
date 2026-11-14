# Encrypted PDF source checkpoints — operator notes

## Scope (not marketplace PDF resale)

This additive feature archives **initial selected source pages** from a server-verified ready-PDF assembly origin. It does not export the user's later header, crop/clean/stretch settings, answers or final assembled output. It does not grant copyright or resale rights. Both library and uploaded-source assemblies can archive their own purchased selection; neither can sell the archive through this feature. Old receipts without an immutable origin remain unverified and cannot use it.

Existing public ready-library source PDFs, existing studio URLs and resource downloads are unchanged. This feature does **not** retroactively make them private. Do not advertise all paid PDF delivery as secured or enable PDF resale on this basis.

## Storage / cryptography

- AES-256-GCM, fresh random 96-bit nonce per object. Binary envelope: `PBV1` (4 bytes), nonce (12), authentication tag (16), ciphertext.
- Authenticated additional data binds domain/version, owner ID, receipt ID, origin hash, plaintext digest and key ID. Plaintext bytes and delivered output are SHA-256 checked. Full source byte digest is recorded when this checkpoint is captured; it is not evidence that these were the same bytes at the earlier checkout.
- Existing Vercel Blob is used for **ciphertext only** under `pdf-vault/<random UUID>.bin`. Its object URL is not an application response, download redirect, component prop or public catalog field. Even a leaked ciphertext URL requires the separately held encryption key for plaintext recovery.
- Manifests live in private settings at `readyvault:v1:<owner>:<receipt>`. Create-only under the existing global financial lock; the service does not debit/credit wallets. A losing concurrent upload or failed manifest write is deleted on a best-effort basis. Failed deletion can leave encrypted orphans; provider storage review/manual cleanup remains necessary. Never delete referenced ciphertext.

## Configuration and staged rollout

No new production environment values are generated or changed by this patch. The feature is **off by default**; an existing correctly configured Blob alone does not enable it.

1. Generate a cryptographically random 32-byte key in a secure operator environment. Store it as 64 hexadecimal characters in a secret manager. Do not use a password, Blob token, auth secret or a test fixture key. Do not commit or paste real keys in issues/chat/logs.
2. Set a server-only encrypted/sensitive Vercel env `PDF_VAULT_KEYS` to a JSON object mapping key IDs to hex keys (shape: `{ "v1": "<64 hex characters from the generated key>" }`). Set `PDF_VAULT_ACTIVE_KEY=v1` (defaults to v1). Keep the existing `BLOB_READ_WRITE_TOKEN`.
3. Use isolated preview storage/key configuration first. Redeploy and validate with authorized test accounts and non-sensitive small sample PDFs. The saved-ready library shows the opt-in checkpoint control only when the keyring and Blob token validate.
4. Before enabling production, back up key material securely and test restoring an old checkpoint. Lost keys make stored checkpoints unreadable; a plaintext fallback does not exist.
5. Rotate by adding a new key ID and changing the active ID, retaining old IDs/keys for decryption. Do not overwrite a key's value in place or remove it while referenced records remain. Existing immutable checkpoints are not re-encrypted automatically.
6. Rollback/disable capture by removing the active key/token configuration only with an operator plan; removing old keys also disables downloads. Disabling the entire feature does not delete existing encrypted objects. Original studio and wallet flows are independent.

## API and limits

- Owner-only Next server action `saveReadySourceCheckpoint(receiptId)` accepts **only a receipt ID**, not client file bytes, URLs or provenance claims.
- Each capture checks fresh receipt + immutable origin before provider work and again before manifest creation. Existing manifest reuse is idempotent; an account has at most 10 new capture attempts per UTC day. Failures consume attempts to bound repeated provider work.
- Server fetch allows only HTTPS Vercel public Blob hosts without credentials, ports, query, hash or redirects; source input max 10 MB, max 100 source pages; 1–10 selected pages; output max 3 MB. Each fetch has a 20-second abort deadline and enforces bytes while streaming, not just Content-Length. PDF parsing is not a general malware/CPU sandbox.
- PDF output is a new document copying selected source pages in original checkout order. Page annotations/actions/metadata references are removed; it is not a rasterized/redacted document, DRM, or a guarantee of removing every hidden resource from an arbitrary PDF. Do not expose an untrusted PDF's selected pages publicly as a privacy boundary.
- GET `/api/ready-vault/<receiptId>` checks the logged-in owner's receipt/origin/manifest before reading storage, verifies GCM + digest, then rechecks authorization before replying. No ADMIN bypass. Any refund/revocation marker on the ready receipt blocks delivery; this is defensive support, **not** implementation of new ready-PDF refunds.
- Delivery is an attachment with private/no-store, nosniff, sandbox CSP and no-referrer. Range requests are unsupported (416). Provider errors and URLs are not returned. An already downloaded or printed copy cannot be revoked.

## Validation and remaining rollout checks

Automated tests use real AES-GCM and real pdf-lib parsing/copying with mocked storage/network/auth/serialized database transactions. They are not production storage, real PostgreSQL concurrency or authenticated mobile browser tests. Before production rollout test those environments, provider outages, key backup/rotation and multi-account denial, and inspect responses for no URL/key leak. Final assembled export, seller approval, PDF buyer institution-only rendering, marketplace purchase/refund integration and migration away from legacy public paid URLs remain separate work.
