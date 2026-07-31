# FriendshipTree Automatic Backup Audit

Date: 2026-07-28
Source reviewed: `FriendshipTree-AI-Workspace(4).zip` → `SOURCE/src/App.jsx`

## Result

Automatic local backups are already implemented in the supplied app source. This roadmap item should not be rebuilt from scratch.

## Verified implementation

- Automatic backup is enabled by default unless `ft_auto_backup_enabled` is explicitly set to `false`.
- A backup check runs five seconds after startup.
- A backup check repeats hourly while the app remains open.
- A backup check runs when the native app resumes.
- A new backup is created when the previous successful backup is at least 24 hours old.
- Backups are written to Android Documents under `FriendshipTree Backups/`.
- Backup filenames are timestamped.
- Seven dated automatic snapshots are retained; older snapshots are deleted.
- The backup captures every app-owned `ft_*` localStorage key.
- Current in-memory nodes, links and dimensions are included even when a debounced save has not yet fired.
- Profile photos and gallery images are read from IndexedDB and included.
- Pending photo writes are awaited before a backup is made.
- The settings screen includes:
  - Export & Share
  - Import File
  - Back Up Now to Phone Documents
  - Automatic daily backup toggle
  - Last successful backup time
  - Last backup error
- Import restores localStorage data, graph data, profile photos and gallery images, then reloads the app.

## Existing backup format

- Format name: `FriendshipTreeBackup`
- Format version: `4`
- Includes app version and export timestamp.

## Important findings

1. The automatic-backup milestone is substantially complete in code.
2. The next sensible task is device verification, not a second implementation.
3. Automatic snapshots are retained, but there is no dedicated in-app list for browsing and restoring the seven snapshots. Restoration currently uses the existing file import control.
4. Backups do not currently include an integrity checksum.
5. The normal node save path notes a known limitation: only the most recent profile photo per person is durably persisted through the primary photo store; extra carousel photos may not survive a restart.
6. Automatic backup runs on a 24-hour schedule rather than after each meaningful change. This matches the current UI wording, “Automatic daily backup”.

## Recommended milestone decision

Mark **Automatic Local Backups — Implemented, pending phone verification**.

Phone acceptance test:

1. Open Settings → Data.
2. Confirm Automatic daily backup is enabled.
3. Tap Back Up Now to Phone Documents.
4. Confirm the success message appears.
5. Open the phone Files app and verify a timestamped JSON file exists in Documents/FriendshipTree Backups.
6. Make a harmless test change.
7. Export or copy the backup somewhere safe.
8. Use Import File to restore it and confirm people, links, history and photos return.

After acceptance, move directly to **Save Verification**.

## Build validation note

A local build was attempted in the analysis environment, but dependency installation could not complete because the environment's private npm mirror did not contain `@capacitor-community/contacts@^7.2.0`. This is an environment registry limitation, not evidence of a source-code build failure.
