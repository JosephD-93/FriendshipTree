# Testing

**Last updated:** 2026-07-22

## Testing rule

A feature is only marked **Tested** when its behaviour has been observed in the relevant current environment. Code existing is not the same as a successful test.

## Confirmed historical tests

| Test | Result | Notes |
|---|---|---|
| Add and use people/groups during an app session | Passed historically | Core interface functioned. |
| Add photos to people during an app session | Passed historically | Durability and restore remain separate concerns. |
| Minimise and resume Android app | Passed historically | This did not prove persistence after closing. |
| Fully close app and retain all changes | Failed historically | Changes were previously lost in affected builds. |
| Previous-day health editing with padlock | Passed historically | User reported it worked very well. |
| Manual export of app data | Passed historically | Export itself worked. |
| Import structured data | Passed historically | Photos were missing after import. |
| Simple map performance | Passed historically | User described it as excellent. |
| Fancy-map performance benchmarking | Passed historically | Multiple feature-by-feature benchmarks were collected. |
| Android APK build/install workflow | Passed historically | Gradle and ADB workflow has worked. |
| Canonical docs installation | Passed | Project root showed expected documentation structure folders on 2026-07-22. |

## Tests still required

### Forge Inbox end-to-end

- place one harmless valid `.ftupdate` package in `StudioSystem\Updates\Inbox`;
- confirm Forge detects it;
- confirm package validation;
- install as candidate;
- launch Studio;
- confirm candidate;
- verify rollback remains possible.

### Storage durability

- add a person;
- change several fields;
- add a photo;
- wait for save state;
- minimise and restore;
- fully close the app;
- reopen;
- restart the phone if practical;
- verify structured data and photo separately.

### Backup and restore

- create a backup;
- confirm visible success feedback;
- inspect backup contents;
- restore into a controlled test state;
- verify people, links, settings, calendar, health data and photos;
- verify result after app restart.

### Developer Hub

For each button:

- confirm the expected path exists;
- confirm the correct command launches;
- confirm failures produce a useful message;
- confirm no button alters source unexpectedly.

## Test log template

Add entries below rather than rewriting historical evidence.

```text
Date:
Build/version:
Device/environment:
Feature:
Steps:
Expected:
Actual:
Result: PASS / FAIL / PARTIAL
Evidence:
Follow-up:
```

## Current test blockers

- Current app version and exact source state are not yet recorded in the dashboard.
- Forge has not been proven end to end.
- Storage behaviour must be re-tested against the latest Android build.
