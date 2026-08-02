# Changelog

## 2026-08-01 — GitHub cloud APK delivery

- Expanded the Android GitHub Actions workflow to run for pull requests, manual requests and approved pushes to `main`.
- Each build now creates a versioned APK name, a SHA-256 checksum and a 30-day Actions artifact.
- Successful `main` builds automatically publish a GitHub Release marked latest, allowing the APK to be downloaded directly on the phone while away from the laptop.
- Local workflow/source validation passed. The first GitHub-hosted build and phone download remain **NOT VERIFIED** until this branch reaches GitHub and Actions completes successfully.

## 2026-08-01 — Android 4.3.1 closely packed widget circles

- Corrected responsive widget sizing to use Android's portrait-height bound rather than the shorter landscape-height bound.
- Replaced full-width weighted button cells with calculated square cells so circles sit close together like the in-app tracker.
- Reduced outer and grid padding while retaining resizing, per-widget rows/columns, tracker selection and progress fill.
- Source/layout checks passed; laptop compilation and phone appearance remain **NOT VERIFIED**.

## 2026-08-01 — Window restoration and Android 4.3 responsive widget controls

- Launcher 1.2.0 and Studio 2.14.9 now remember their last normal or Windows-snapped bounds and restore them on the next launch.
- Saved bounds are rejected when they no longer overlap a connected display, preventing an off-screen window after a monitor change.
- Android 4.3 adds per-widget tracker, row and column settings (1–8 rows and 1–6 columns).
- Added an in-widget settings control so an existing widget can be reconfigured without deleting it.
- Widget resize events now recalculate circle bitmap size from the launcher's reported width and height; cell padding was reduced to minimise gaps.
- The widget supports horizontal and vertical resizing down to a compact 110dp footprint while retaining the existing progress fill and shared tracker data.
- Launcher/Studio syntax checks and the Vite production build pass. Android compilation and all laptop/device behaviour remain **NOT VERIFIED** until installed through Launcher.

## 2026-08-01 — Launcher 1.1.0 reliable Android phone delivery (laptop verification required)

- Replaced Launcher's bare `adb` commands with automatic Android SDK Platform-Tools discovery, matching the working Studio approach.
- Launcher now invokes the discovered `adb.exe` directly and safely passes APK and package-manager arguments without Command Prompt quoting.
- Added a phone-readiness gate before the web/Capacitor/Gradle build begins, with distinct messages for missing ADB, disconnected phones and unauthorised phones.
- Added **Send built APK to phone again** when a phone disconnects after the build, avoiding a second update application or rebuild.
- Retained on-device package verification after ADB reports installation success.
- Source syntax checks passed. Installation and phone delivery through Launcher 1.1.0 remain **NOT VERIFIED** until applied on Joe's laptop.

## 2026-08-01 — Android 4.2 circular selectable health widgets (laptop/device verification required)

- Replaced the temporary text-row widget with large circular emoji controls based on the in-app tracker.
- Widget circles use each list's saved colour and saved grid-column count; their fill is calculated from `count / daily target`.
- Added per-widget tracker selection when a widget is placed, so multiple widgets can show different health lists.
- Added an in-widget switch control for moving between lists without deleting the widget.
- Increased the displayed category limit from 6 to 24 and retained tap-to-increment synchronisation.
- Consolidated end-of-day rollover into one idempotent routine that immediately persists history, scores, reset date and cleared new-day counts.
- Native widget refresh/increment also performs rollover and commits the shared state synchronously.
- Web production build passed. Android compilation and Pixel 10 behaviour remain **NOT VERIFIED** until Launcher builds and installs this package.

## 2026-08-01 — Android 4.1 widget row visibility fix (device retest required)

- Confirmed on Pixel 10 that the widget received the correct list and six categories, but styled `Button` rows showed only their backgrounds.
- Replaced widget item buttons with launcher-safe clickable `TextView` rows.
- Added a dedicated rounded row background and explicit runtime text colour to prevent launcher/theme overrides from hiding labels and counts.
- Kept the existing tap-to-increment intents and health-state bridge unchanged.
- Status: source/XML checks passed; replacement build and phone display are **NOT VERIFIED** until installed through Launcher.

## 2026-07-31 — Android 4.1 health-widget foundation (not yet device-verified)

- Added an Android home-screen widget for up to six items from the first health list.
- Added tap-to-increment behaviour, current/target display and a heading that opens FriendshipTree.
- Added a Capacitor Preferences bridge so the native widget and React health tracker can exchange today/history state.
- Added midnight rollover handling that moves the previous day into history before a widget increment.
- Added widget refresh when the app pauses and reconciliation when the app resumes.
- Added a branch-safe GitHub Actions Android build that produces a debug APK after the verified source is pushed.
- Advanced the Android source version from `4.0` (`versionCode 1`) to `4.1` (`versionCode 2`).
- Status: source reviewed; Vite build, Capacitor sync, Gradle build, APK install and on-device behaviour are **NOT VERIFIED** in this environment.

## 2026-07-22 — Canonical project consolidation

- Agreed to stop creating updater and launcher spin-offs.
- Fixed the permanent architecture around the app, Studio, Forge and the Inbox.
- Cleaned historical Studio versions, Forge experiments, installers, packages and duplicate reports from the project root into Archive.
- Produced an Inbox-only Forge replacement.
- Began canonical documentation.
- Preserved generated outputs rather than deleting them.
- Kept the active React/Capacitor source at the project root to avoid path breakage.

## Earlier development highlights

- Android application built with React, Vite and Capacitor.
- Social graph, groups, people, relationships and photos developed.
- Health lists gained adjustable layouts and editable previous-day records.
- Fancy-map performance benchmarking and feature toggles were introduced.
- Vines and leaves received significant performance work.
- Mascot direction converged on a family of mole characters.
- Android widgets, multi-contact onboarding, backup durability and camera navigation were planned or partially developed.

This changelog intentionally distinguishes broad historical work from confirmed current implementation. Current source must be inspected before marking any older feature complete.
