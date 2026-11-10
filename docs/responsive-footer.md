# Compact responsive footer links

User screenshot shows homepage footer navigation stacked into a long single column on mobile.

- Home footer: brand full-width above two mobile link groups; policy section below spans both columns with its links split into two columns. At 640px, brand stays full-width with all three navigation groups beside each other. Existing desktop four-column brand + navigation layout retained at 900px.
- Shared site footer also uses two mobile link-group columns, policy spanning both with a two-column list, then three groups at 640px.
- All links, dynamic CMS pages, contact details and socials retained. Long labels/email can wrap instead of truncating or causing horizontal overflow. Links have minimum 36px height; existing bottom-navigation padding preserved.
- No routes, account/payment logic or DB schema changed.

Validation: TypeScript, 125 regression/security tests, Next production build and diff check passed (dummy local environment). Static markup generated from actual async footer components with mocked site/CMS data. Chromium uses actual Tailwind, home/workspace CSS and local Hind Siliguri Bengali font: both footer variants, with/without long CMS title/contact address, at 320/390/640/768/1024/1440px; correct grid counts, sibling link groups sharing a row and no document horizontal overflow. Fixtures outside Git /home/user/footer-browser. Actual authenticated production/browser and Vercel deployment not checked for this PR.

Owner preview checklist:
1. Mobile homepage footer: first two groups side by side; policy links in two columns; brand above.
2. Check policy/contact/CMS/social links remain usable and readable at narrow width.
3. Tablet: three navigation groups beside each other; desktop retains brand + three groups.
4. Check shared footer on non-home pages and bottom mobile navigation spacing.

Agent opens PR, owner merges unless expressly authorizing merge; after merge rerun mocks and check Vercel deployment.
