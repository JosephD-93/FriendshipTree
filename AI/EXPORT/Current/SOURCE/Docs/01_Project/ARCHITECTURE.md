# Architecture

## Active application

Technology:

- React
- Vite
- Capacitor Android
- local browser/WebView storage
- IndexedDB for photo data
- Capacitor native plugins where required

The active source currently remains at the repository root:

- `src`
- `public`
- `android`
- root configuration files

## Studio

FriendshipTree Studio is the developer environment around the app. It should remain a single maintained project rather than spawning replacement Studio projects.

## Forge

Forge is the launcher and Studio version manager.

Conceptual system layout:

```text
StudioSystem
├── Bootstrap
│   └── FriendshipTree-Forge.ps1
├── Versions
├── SharedData
├── Backups
├── Logs
└── Updates
    └── Inbox
```

Forge package format:

`Studio-x.y.z.ftupdate`

A package should contain a valid FriendshipTree manifest and the payload required for that Studio version.

## Boundaries

- Forge manages Studio versions.
- Studio is the developer interface.
- The React/Capacitor project is the app source.
- Shared user data must not be stored inside a disposable version directory.
- Historical releases belong in Archive or Generated Builds.
