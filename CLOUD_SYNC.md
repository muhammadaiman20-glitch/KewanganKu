# Automatic cross-device sync

KewanganKu now stores the signed-in owner's financial records in Cloudflare D1. Browser localStorage remains a local working copy. Access must allow the same owner Gmail on each device; the editable profile email does not control authentication.

Production binding: `DB` → `kewanganku-sync` (D1). Apply `schema-sync.sql` before deploying. Preserve the existing `AI`, `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN` and `OWNER_EMAIL` bindings/settings. No database credentials are shipped to the browser.

## Behaviour

- Each device uploads edits after a short debounce, polls every 15 seconds while visible, and refreshes on focus/visibility/online events. Changes made offline remain in the browser and are retried when online or on the next visit.
- Existing records are migrated from the current browser when the updated app opens. A new browser starts empty and downloads cloud records; it does not introduce sample records.
- `/api/state` GET/PUT requires a verified owner Cloudflare Access JWT. The user key comes from the trusted server setting, never from a client-supplied email.
- Writes use an atomic revision/generation check in SQLite/D1. Stale writes receive HTTP 409 and are merged against a saved baseline. Independent record inserts/edits are preserved. Edit/delete conflicts require a choice rather than silent replacement.
- Debt, bill and vehicle records are treated atomically when both devices edit the same record, to avoid combining payment histories with an inconsistent balance or odometer. The review shows both versions. Choosing a version affects conflicting records/fields; nonconflicting changes are kept.
- A recovery snapshot is saved before conflict resolution or replacing unsynced edits after a reset from another device. Settings can download it for review.
- Reset Everything now clears the shared cloud data and increments its generation. Other devices accept that reset instead of resurrecting old records. Reset requires a working connection and explicit typed confirmation; the app does not report success for a failed reset.
- Sync state displays actual server acknowledgement time in Malaysia time. Google Drive simulation has been removed.

## Storage and limits

`account_state` contains one document per owner, a revision, reset generation and update timestamp. State validation rejects malformed records and duplicate IDs. Each snapshot is limited to 1 MB; browser recovery/baseline copies also use browser storage. Export JSON backups independently. Receipt images are still processed by Workers AI and are not persisted by the scanner.

Local cache key: `kewanganku_app_data_v2`. Baseline: `kewanganku_sync_meta_v1`. Recovery: `kewanganku_sync_recovery_v1`. Do not clear these keys to troubleshoot migration before exporting backups.

## Verification

`npm test` includes Worker route + actual SQLite tests for concurrent inserts, conflict resolution, deletion, offline/reconnect, edits during an upload, reset generation, stale writes and authentication. Chromium verification used separate phone and PC browser contexts and a signed test identity through the actual Worker code and SQLite: phone expense appeared on PC, offline PC expense reached phone, conflicting profile edits required review, and shared reset reached both. These tests use isolated data, not production customer records.

The production D1 schema and binding are provisioned through Cloudflare. Local Express development returns an explicit unavailable response for sync, rather than simulating cloud success.
