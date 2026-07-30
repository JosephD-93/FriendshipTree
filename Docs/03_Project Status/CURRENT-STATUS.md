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
