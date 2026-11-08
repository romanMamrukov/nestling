# Nestling — GitHub Pages preview

A free, mobile-first, browser-only baby sleep tracker and scheduling estimator.

## Publish with GitHub Pages
1. Go to **Settings → Pages** in this repository.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose **main** and **/(root)**, then **Save**.
4. Once GitHub reports the site published, open https://romanmamrukov.github.io/nestling/

No GitHub Actions, build step, npm, custom domain, or paid hosting are required. A public repository can use free GitHub Pages, subject to GitHub's current eligibility rules.

## Included in this Pages build
- Baby name, birth date, and personalized bedtime onboarding
- Responsive Today / History / Insights / Settings screens
- Persistent sleep timer and editable manual sleep logs
- Session deletion with confirmation, overlap/time validation
- Basic age/history wake-window estimates, separated nighttime waking and bedtime anchor
- Daily and rolling 24-hour recorded sleep totals, last seven days graph
- Browser-local data persistence, JSON export/import and full reset
- Reminder attempts while the page is active

## Important differences from the earlier Nestling v2.1 package
This repository currently contains a **standalone Pages preview** in `index.html`, **not the complete earlier multi-file v2.1 project**. It reimplements its core user flows, but the v2.1 modular prediction engine, original automated test suite, and optional Supabase authentication have **not** been imported into this repository. Do not interpret the earlier 13/13 test result as verification of this standalone build.

**No real login / accounts / cross-device sync:** GitHub Pages is static hosting, and this preview stores data in browser localStorage. Clearing site data or using another browser/device will not synchronize records. Do not treat this as authenticated storage.

**No reliable push:** Notifications are best-effort while the page is open; mobile browsers may suspend background tabs. There is no service worker push subscription, backend, or background scheduler.

**Not medically validated:** Wake-window starting values are software heuristics, not medical wake-window guidelines. Estimated sleep times predict a family schedule, not clinical sleep needs. Guidance on total sleep duration is population-level and does not determine precise nap timing. The insights screen's error proxy is **not** a validated prospective forecasting accuracy metric.

## Preview acceptance test
On a phone or desktop:
1. Create a baby profile.
2. Start a sleep timer and stop it after a minute.
3. Create a past entry, edit it, then delete it.
4. Check that totals update and no sessions overlap.
5. Open Insights and Settings; edit bedtime and reminder.
6. Export a backup, delete all records, and restore the backup.
7. Refresh the page; confirm records persist.

The code was uploaded via the GitHub connector. Full browser/device end-to-end testing has **not** been verified.

## Safety and privacy
This is a private-device prototype. Avoid entering identifiable child health information on shared devices. Public use requires a privacy notice and GDPR compliance review, and production cloud accounts require a properly configured backend with access controls. This app does not replace infant safe sleep recommendations, supervision, or medical advice.
