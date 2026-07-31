# FriendshipTree Architecture

## FriendshipTree app
React/Vite application packaged for Android using Capacitor.

## FriendshipTree Studio
Developer-facing desktop environment. Installed Studio versions live under `StudioSystem\Versions`.

## Electron Launcher
Polished user-facing dashboard and taskbar entry.

## Forge
Canonical Studio package validation, staging, candidate confirmation and rollback engine:

`StudioSystem\Bootstrap\FriendshipTree-Forge.ps1`

## Update flow

Approved `.ftupdate`
→ `StudioSystem\Updates\Inbox`
→ Forge validates `manifest.json`, `payload/`, required files and SHA-256 checksums
→ installs beside the confirmed Studio version
→ confirms or rolls back candidate

## Boundaries

- Launcher may invoke Forge but must not replace Forge's safety contract.
- No competing launcher, updater, Core application or duplicate Studio.
- User data must not be stored only inside disposable application-version folders.