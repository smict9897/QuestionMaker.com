# Compact homepage header branding

Per the user's second screenshot, the large navy logo-intro card is no longer imported/rendered by the homepage. The first main section is again HomeStarter (question setup). Existing paper animation, forms, menu, account controls and saved questions are unchanged. Prior intro component/assets retained for reuse but not mounted on home.

New `components/brand-wordmark.tsx` and `.css`: bold tightly tracked QuestionMakerBd wordmark, teal .com, subtle mount entrance and two gentle domain pulses, hover/focus lift, static readable reduced-motion fallback. No infinite blinking, splash or overlay. Custom admin site name is retained (only exact default name is split into styled parts). Old broad header span selectors narrowed so nested brand spans inherit their intended font sizes. Homepage header only; other page header branding remains unchanged.

Verification: 179 existing tests, TypeScript, dummy-environment production build pass. Isolated mock header uses actual wordmark and workspace CSS, checks 320/360/390/768/1440px, no horizontal overflow or account overlap, no intro and reduced motion. Not a complete authenticated homepage/browser session. Preview fixtures and dependencies are outside Git.

Manual: production homepage logged in/out, custom saved site name, narrow native phone, dashboard/logout and LEFT menu, reduced-motion and hover/focus. Intro removal can be checked in app/page.tsx: HomeStarter is first in hm-hero-stack. No DNS/database changes.
