# Current Status

## Confirmed project layout

The active FriendshipTree project currently contains:

- `src`
- `public`
- `android`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `capacitor.config.json`
- `FriendshipTreeStudio`
- `StudioSystem`
- `Tools`
- `.friendshiptree`
- `.studio`

Historical versions and experiments have been moved into `Archive`.

## Forge

The current intended Forge version is the Inbox-only build.

Expected location:

`StudioSystem\Bootstrap\FriendshipTree-Forge.ps1`

Expected update inbox:

`StudioSystem\Updates\Inbox`

Forge is intended to:

1. inspect the Inbox;
2. recognise valid FriendshipTree update packages;
3. install the update as a separate Studio version;
4. retain the last working version;
5. support confirmation or rollback.

The latest Forge replacement has been installed by the user, but the full package-install workflow still needs a controlled end-to-end test.

## App

The application has working social graph functionality, people and groups, photos, health-list interactions and Android packaging. Persistence and backup have been major areas of work.

The current source version is Android `4.3.1` (`versionCode 5`). The health widget uses large, closely packed circular emoji controls, progress fill, per-widget list selection, list switching, configurable 1–8 rows and 1–6 columns, and responsive circle sizing when the home-screen widget is resized. Version 4.3.1 corrects the portrait-height calculation and removes full-width invisible button cells that caused undersized, widely separated circles. End-of-day rollover remains consolidated and immediately persistent. Source/layout checks passed; the Android 4.3.1 build and phone appearance remain **NOT VERIFIED** until applied through Launcher.

Launcher source is now `1.2.0`. It retains the 1.1.0 Android-delivery repair and now restores its last snapped or manually positioned window bounds. Studio source is `2.14.9` and uses the same visible-display-safe bounds restoration. Syntax checks pass; laptop behaviour remains **NOT VERIFIED** until the updates are installed.

Known storage systems described during development:

- `localStorage` for much of the application state;
- IndexedDB for photos;
- Capacitor Preferences as an additional persistence layer in limited areas;
- Capacitor Filesystem for exports, backups and photo durability.

## Project organisation

The root has now been substantially cleaned. The next safe organisation stage creates:

- `Docs`
- `Scripts`
- `Assets`
- `Packages`
- `Tests`
- `Generated Builds`

The active React/Capacitor source remains at the root for now to avoid breaking existing configuration and build paths.
## GitHub cloud APK delivery

- The Android GitHub Actions workflow is implemented in the current feature source.
- Pull requests and manual runs build a versioned debug APK plus SHA-256 checksum.
- Approved pushes to `main` additionally publish the APK as the latest GitHub Release for direct phone download.
- Local Vite and workflow validation pass; the first GitHub Actions run, Release creation and remote phone installation are **NOT VERIFIED**.
