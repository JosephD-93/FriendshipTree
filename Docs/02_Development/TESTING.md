# Testing

**Last updated:** 2026-07-31

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

### Android 4.2 circular selectable health widget

- add a new widget and confirm the tracker-selection screen lists every saved tracker;
- add two widget instances assigned to different trackers and confirm each retains its own choice;
- confirm the title, emoji order, list colour and saved column count match the in-app tracker;
- confirm circles are comfortably tappable and darken progressively at `count / target`;
- tap the switch control and confirm only that widget advances to the next list;
- tap categories in the widget and app and confirm both surfaces reconcile the same counts;
- test rollover with a controlled prior reset date: archive the prior day once, preserve existing history, clear today and retain the new date after app restart;
- leave the app backgrounded across midnight (or use the controlled fixture), tap the widget first, then confirm the prior day was saved before the new count was added;
- confirm Launcher's Vite, Capacitor and Gradle stages complete and the Pixel 10 installation succeeds.

### Android 4.1 health widget row visibility retest

- install the widget row-visibility fix through Launcher;
- remove and re-add the widget if Android retains the old RemoteViews layout;
- confirm all six item icons, labels and current/target counts are visible;
- tap at least one row and confirm its displayed count increments once;
- open FriendshipTree and confirm that increment appears in the in-app health list.

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

### Android 4.1 health widget

- install the update through Launcher's `app-update` workflow;
- confirm Vite build, Capacitor sync and Gradle debug build all pass;
- confirm Launcher reports the APK installed and verifies the package on the phone;
- add the FriendshipTree Health widget from Android's widget picker;
- confirm the first health list and up to six items appear;
- tap each displayed item and confirm its count increments once per tap;
- open FriendshipTree and confirm widget changes reconcile into today's health counts;
- change a count in the app, leave the app and confirm the widget refreshes;
- test a date rollover or controlled date fixture and confirm the previous day is retained once in history;
- restart the app and phone, then confirm counts remain consistent;
- confirm the widget heading opens FriendshipTree;
- record PASS / FAIL / PARTIAL below with device and build evidence.

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

- Android 4.1 compiled and installed; its first phone test proved the data bridge but found invisible row text. Android 4.2 supersedes that temporary layout and requires a fresh Launcher build and phone test.
- Forge has not been proven end to end.
- Storage behaviour must be re-tested against the latest Android build.
