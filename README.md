# Nestling

**A calm, simple way to follow your baby's sleep.**

Nestling is a free, mobile-friendly web app for recording sleep, understanding daily rhythms, and planning the next nap or bedtime. Its quiet interface keeps sleep tracking easy, even during busy days and late nights.

**Website:** https://romanmamrukov.github.io/nestling/

## What Nestling does

- **Sleep timer** — record sleep in one tap or choose the actual start time, even while a timer is running.
- **Sleep history** — add, edit, and delete records, including naps that cross midnight.
- **Sleep forecasts** — see an estimated next nap or bedtime based on age and recent recorded patterns.
- **Daily overview** — see today's logged sleep, the last 24 hours, and recent sessions.
- **Weekly trends** — view seven days of recorded sleep.
- **Personal settings** — set your baby's name, birth date, and preferred bedtime.
- **Reminders** — see an in-app reminder before the next estimated sleep time. On supported installed web apps, optional device notifications can also be enabled and tested.
- **Three languages** — switch between English, Latvian (Latviešu), and Russian (Русский).
- **Your data, your choice** — sleep records and preferences stay on your device. Export or restore JSON backups, create optional encrypted backups, and receive a gentle evening backup reminder.

## Thoughtful by design

Nestling favors a minimal interface, clear information, and a few meaningful actions over complicated dashboards. It works on phones, tablets, and computers without downloading a native app.

The website is hosted with GitHub Pages. It runs directly in the browser with no registration or subscription.

## Privacy

Nestling keeps your sleep records and preferences locally in your browser. They are not uploaded to a Nestling server. Data does not automatically sync between devices or browser profiles. You can export a copy or delete your locally stored records at any time.

Please use a trusted device and retain a backup if your sleep history matters to you. Clearing browser data or using private browsing may remove local records.

## Understanding sleep forecasts

Forecasts are estimates based on recorded patterns and age-related scheduling assumptions, not medical assessments. They are not clinically validated and may be less useful when records are incomplete. Parents should follow their baby's cues and seek advice from a qualified healthcare professional when needed.

Nestling is not a baby monitor, a medical device, or a substitute for safe sleep practices.

## Project

Nestling is an independent web project exploring a simpler and more accessible experience for baby sleep tracking and scheduling.

Built with HTML, CSS, and JavaScript. Hosted on GitHub Pages.

## Repository

This repository contains the public Nestling website:

- `index.html` and `app.js` — interface and sleep-tracking experience
- `schedule.js` — age-based sleep forecasts
- `storage.js` and `backup.js` — local data and portable backups
- `i18n.js` — English, Latvian, and Russian translations
- `sw.js` and `manifest.webmanifest` — offline support and installation
- `.nojekyll` — GitHub Pages configuration
- `README.md` — project information

© Nestling.