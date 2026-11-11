# Writing provider schema compatibility

Reported symptom: `letter-email: JSON schema mismatch` after six completed tasks had been recovered. No raw failed provider response was available, so the precise historical field failure is unconfirmed.

Reproduced failure: an otherwise correct writing prompt with omitted/null `subitems`, or null unused optional fields, fails the strict output schema. At the provider assembly boundary only, selected writing tasks now map omitted/null subitems to [] and omit null passageKey/clues/table/answer. No prompt, sample answer, topic, task id or substantive content is fabricated. No additional provider call/retry is made. Nonempty or wrongly typed fields, missing requested answers, extra keys/tasks, topic/word-limit mismatch and grammar/reading counts still fail. Saved drafts and bank validation keep their strict schema. Existing per-task checkpoint/database recovery flow is unchanged.

Prompt now explicitly requires string email/application answers (line breaks for headers/body), no extra email-specific object fields, and no optional nulls. Unrecoverable schemas expose at most three allowlisted field paths/error codes, never provider text or unknown field names. Invalid JSON gets a separate safe diagnostic.

Verification: 176 tests, TypeScript and dummy-environment production build passed. Mock provider tests cover safe normalization, strict draft behavior, required answer enforcement, malformed answer rejection and diagnostic redaction. No live paid provider/authenticated database execution was done. Screenshot-specific root cause and semantic correctness are not claimed proven.

Manual checklist: generate Class 6 English 2 full paper with each correspondence subtype, both with and without answers; verify the chosen topic and sample format. Check a deliberately failing later task leaves only earlier complete tasks in recovered drafts. Reopen/edit/save a recovered draft. Repeat Class 11 English 2 reported workflow with safe field diagnostic if provider still fails.
