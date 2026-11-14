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

### Admin rollout diagnostic

`/admin/pdf-storage` offers a fresh-ADMIN, explicit-consent one-page synthetic-PDF roundtrip using the current deployment's config. It is not an automatic gate/enabler and does not create encryption keys. It reserves at most one attempt per 60 seconds across admins, writes ciphertext only, checks read/decrypt integrity and attempts object deletion. A successful format/config check alone does not prove storage connectivity. A failed cleanup is an unsuccessful overall result; private `pdf-vault:diagnostic:audit:v1:<id>` records the orphan ciphertext URL for operator cleanup, never exposes it in the action response. Diagnostic audits/rate records do not touch wallet balances or receipts. Automated tests mock the provider; a real runtime diagnostic, key backup/rotation, account isolation and end-to-end flows are still required before production readiness claims.

## Paid resource PDFs (phase 27)

New non-video paid `Resource` PDF uploads now require the vault and a PDF file (max 3 MB, 100 pages). They are encrypted before upload and provider-read/decrypt-verified before an atomic resource/manifest insert. No public fallback exists when the vault is unavailable. Free PDF uploads retain legacy public behavior (4 MB limit); external paid video links remain legacy external hosting, not encrypted or DRM. A free public non-video resource cannot be converted to paid solely by price edit; add a new encrypted paid resource instead.

For eligible legacy paid resource PDFs use `/admin/pdf-storage/resources`: fresh ADMIN, explicit consent, at most 10 migration attempts/day/admin. Source must be an HTTPS Vercel public Blob URL; external PDFs/videos are excluded. Source bytes are bounded to 3 MB and must parse as <=100 pages. The replacement ciphertext is read back/decrypted before a locked atomic source-comparison/manifest/pointer/audit commit. Concurrent/failed uploads clean their ciphertext best-effort. Provider work is outside the commit transaction. This migrates the **Resource** subsystem only, not ready-paper sources or purchased marketplace snapshots.

`Resource.fileUrl` becomes `private-resource:v1:<resource ID>`. The original source URL/hash remains in a private migration audit, not public component props. `/api/download/<id>` recognizes that marker and returns an authenticated no-store PDF attachment, not a storage redirect. It validates current DB user/ADMIN role or exact PAID purchase, binds resource/manifest/digest, checks permission again after storage I/O, and never falls back to the old URL. Range requests are unsupported. A migrated resource explicitly set to zero price is deliberately free and may be downloaded without login. The PDF is not sanitized/rasterized; it is delivered as a sandboxed attachment. Downloaded/printed copies cannot be recalled.

**Migration does not delete the legacy public object.** Original URLs/caches can still serve the original until a separately planned retirement. No automatic delete endpoint is included: inventory references across resources, ready origins, external links and backups first; establish backup/restore and approved deletion/retention procedure, then retire unshared source objects through the provider with an operator audit. Do not claim all legacy URLs are private/revoked just because the application pointer is migrated. No production file migration, key provisioning or provider test is performed by deploying this code alone. Automated tests mock DB/provider; runtime readiness, production inventory and real multi-account E2E are still mandatory.

## Explicit original retirement (phase 28)

Migration is still non-destructive by default. After verifying key backups/restore and encrypted download, an ADMIN can separately confirm retirement in `/admin/pdf-storage/resources`. This only supports canonical Vercel Blob URLs in the legacy `/notes/` upload namespace with matching immutable migration/source digest and decryptable encrypted archive. It does NOT handle ready-paper sources, external videos/links, arbitrary provider paths or unmatched/shared sources.

The service rechecks fresh ADMIN role, locks the migrated resource and source reference key, and refuses other Resource/direct Setting references to the old URL (case-insensitive checks). It cannot discover every encoded/indirect alias, external link, PDF-embedded reference or third-party copy; the operator must inventory those and confirm before proceeding. False-positive references in historical records conservatively block deletion and require investigation, not bypass.

External deletion is not a database transaction. Before calling the provider, persist PENDING intent, immutable attempt audit and a permanent blocked-source tombstone in one transaction. All new application-created external resource references take the same source lock and reject this marker, including when deletion is uncertain. Provider success records REMOVED and updates the migration audit; an exception records UNKNOWN and never asserts successful deletion. Finalization failure leaves persisted PENDING intent, not a fake rollback of the provider deletion. No fallback to the old file is introduced. Direct DB/provider changes are outside this coordination and must not reintroduce retired URLs.

A PENDING operation is not retried in its first five minutes. After investigating the audit/provider state, ADMIN may explicitly retry older PENDING/UNKNOWN operations with fresh backup/destructive consent; the archive is reverified each time. Same-operation finalization checks prevent a stale worker overwriting a newer attempt. REMOVED retries are idempotent. Keep the tombstone even when provider status is uncertain. Do not remove/overwrite migration, manifest, intent or attempt records manually to force completion.

REMOVED means the storage deletion call returned success, not proof that every edge cache/public client link has expired. Downloaded, printed and cached copies cannot be recalled. No production files are retired automatically by deploy; this patch adds a gated operator workflow only. Automated tests mock provider and serialized DB, so real provider propagation, backup restore and database concurrency checks remain rollout requirements. Financial balances, receipts and payouts are never changed by retirement.
