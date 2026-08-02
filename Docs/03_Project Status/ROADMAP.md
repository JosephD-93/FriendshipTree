# Roadmap

## Immediate priority

Prove the Forge update path end to end with one harmless valid package placed in:

`StudioSystem\Updates\Inbox`

Success means:

- Forge detects it;
- validation succeeds;
- it installs as a candidate version;
- Studio launches;
- confirmation works;
- rollback remains available.

No further updater architecture work should begin until this test passes.

## Project consolidation

1. install the canonical documentation in `Docs`;
2. preserve old outputs in `Generated Builds`;
3. keep active scripts in `Scripts`;
4. identify the exact source-of-truth roles of `FriendshipTreeStudio`, `StudioSystem` and `Tools`;
5. create a current file manifest;
6. package only the necessary context for future conversations.

## App priorities already discussed

- reliable automatic local backups;
- Google Drive backup strategy;
- restore photos as well as JSON data;
- multi-contact import and onboarding;
- Android home-screen health widget — 4.3.1 close-packed circle correction complete in source; next gate is Launcher build/install and phone testing;
- GitHub cloud APK delivery — workflow complete in source; next gate is an approved push to `main`, successful Actions build, Release APK download and phone installation test;
- daily-use mascot widget;
- camera navigation and nearby directional controls;
- fancy-map performance;
- continued health-list editing improvements.

These are not all confirmed implemented. Each must be checked against current source before work resumes.

## Current app delivery gate

Deliver Android `4.3.1` as a checksum-verified `app-update` through `StudioSystem\Incoming` (or the configured Google Drive Incoming folder). Launcher must back up replaced files, build Vite, synchronise Capacitor, build the debug APK and install it on an authorised phone. Verify that circles are comparable in size and spacing to the in-app tracker, plus list selection, rows/columns, horizontal and vertical resizing, multiple widget instances, circle progress, app/widget synchronisation and midnight rollover before marking it tested or pushing it to `main`.

After the verified source reaches `main`, confirm the **Build Android APK** GitHub Actions run succeeds. On the phone, open the latest GitHub Release, download the versioned APK asset, install it and confirm the displayed app version. This is the supported away-from-home delivery test; ADB is not involved.
