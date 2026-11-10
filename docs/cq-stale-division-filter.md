# CQ counted but absent from preview

User screenshots show 10 MCQ + 4 CQ + 5 SQ counted, but only MCQ and SQ printed. Reproduced that exact count/visibility symptom in a Chromium mock with the previous builder source: show.divisions=true and cfg.divisionFilter referencing an old topic, while new CQ rows belong to a different topic. The builder calculated CQ counts before grouping; the stale grouping filter removed all CQ. Native select with an unavailable value could visually appear to show the first "all divisions" option. User production localStorage was not inspected, so this is a confirmed reproducible failure path, not a claim of direct account diagnosis.

Fix:
- New selections reset divisionFilter, exclusions and edits while retaining header, fonts and column preferences. Append path unchanged.
- Builder validates stored filter membership against available CQ groups. Unknown filter falls back to all available groups instead of suppressing CQ; the dropdown reflects that effective all-groups state.
- Valid intentional filters still work, with an explicit visible status telling users how to display all CQ.
- Existing saved paper data is not deleted/migrated; stale saved filters also render safely.

Checks:
- TypeScript, 109 tests, Next production build and diff check passed. Dummy local build environment; no DB/provider writes.
- Real picker/builder/Tailwind mock Chromium: previous source reproduces CQ(4) with zero CQ rendered; fixed source with same state renders all four CQ in MCQ→CQ→SQ order.
- New selection through all three tabs resets old filter and shows 10/4/5 items; mobile reload retains CQ; valid filter retained with status; zero JS errors.
- Physical PDF parsed: one page with all four exact CQ markers present once.
- Harness outside Git at /home/user/cq-filter-browser. Browser initially needed marker word boundaries (MCQ_MARKER contains CQ_MARKER); corrected to avoid false positives. Orphan browsers from failed test assertions cleaned up after launch resource failure.
- No authenticated production account or deployment verification for this PR.

Owner preview checklist:
1. Reopen affected paper/settings: all four CQ should show even if old saved chapter filter is absent from current groups.
2. Select new 10 MCQ + 4 CQ + 5 SQ; confirm all three types and PDF contents, including all four CQ.
3. With grouping enabled, choose a real division: status must disclose active filter. Choose সব বিভাগ to show all CQ.
4. Check one/two-column flow, reload and saved reopen; layout preferences should remain.

Agent creates PR; owner merges unless separately authorizing merge. After merge rerun mock test and check Vercel status.
