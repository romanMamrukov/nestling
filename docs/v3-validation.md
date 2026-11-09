# Nestling v3 — Beta acceptance checklist

This document applies to the `feature/offline-v3` development branch only. The public `main` release is unchanged.

## Automated checks
From the repository root, with Node.js 18 or later:

```sh
npm test
```

The dependency-free tests cover validation of sleep records and preferences, backup format compatibility, encryption and decryption, wrong passwords, UI localization keys, and offline resource lists.

## Device-level verification — required before merge

### Migration from v2
1. In the existing v2 site, enter a baby profile, preferred bedtime, non-English language, and at least three sleep records.
2. Export a plain JSON backup before testing.
3. Load a local build of the v3 branch **on the same origin and browser profile**. Confirm the records, timer state, and preferences migrate correctly.
4. Confirm the v2 `localStorage` key is preserved as the original recovery source after migration.
5. Test a deliberately malformed v2 dataset. Confirm migration stops without overwriting it, and the emergency export remains available.

**Important:** A local server on another origin or port does not share GitHub Pages browser storage. Testing an actual v2-to-v3 migration requires preserving the original origin.

### IndexedDB, backup, and recovery
1. Start a timer, refresh, and confirm its elapsed time continues.
2. Add, edit, and delete several sessions, including sleep crossing midnight.
3. Reject invalid future, overlapping, duplicate, and over-18-hour sessions.
4. Export a JSON backup. Reset all local data. Re-import; confirm records, language, and settings match.
5. Export an encrypted backup with a 12+ character passphrase. Import successfully with the correct passphrase and reject an incorrect passphrase without modifying current data.
6. Open two tabs and edit data from both. Confirm a stale tab cannot overwrite the newer revision.
7. Attempt storage failures and blocked upgrades. Confirm no silent data loss.
8. Confirm discarding an active timer preserves completed sessions.
9. Validate timezone changes and daylight-saving behavior.
10. Check persistent storage request behavior and rejection on supported/unsupported browsers.

### PWA and offline operation
1. Install on Android Chrome and iOS Safari using Add to Home Screen.
2. Open once online, turn on airplane mode, fully close and reopen the installed app.
3. Log and edit sleep while offline; refresh and confirm persistence.
4. Confirm all three languages and forecasting load offline without fetching external resources.
5. Validate the update banner and controlled service-worker activation.
6. Confirm reminders can appear while the app is foregrounded, but **never promise delivery when it is closed or suspended**.
7. Verify browser storage clearing does remove local data; restore from an exported backup.

## Release gate
Do not merge to `main` until these device checks pass and known issues are documented. A green source syntax check is not a substitute for a real browser test.
