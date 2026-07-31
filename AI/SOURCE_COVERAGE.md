# Source Coverage

Generated: 31/07/2026, 11:33:32

This handover contains the meaningful editable source and documentation
from the live FriendshipTree project. It is not a byte-for-byte backup.

## Included systems

- App source and configuration: 20 files
- Android project and widget source: 42 files
- FriendshipTree Studio: 415 files
- FriendshipTree Launcher: 17 files
- Forge update/recovery system: 3 files
- Canonical AI documentation: 14 files

The Launcher is deliberately included even if it has not yet made installation easier.
It is part of the real current system and must be visible to the next AI.

## Deliberately excluded

- Dependencies such as node_modules.
- Android, Gradle, Vite and Electron build outputs.
- Caches and generated intermediates.
- Old archives, updater backups, quarantine and recovery copies.
- The AI export folder itself, to prevent recursive exports.
- Binary or oversized files that are not useful editable source.

## Authority labels

- canonical-documentation: project rules and explanatory documents.
- exact-current-source: copied directly from the live canonical project.
- project-support-file: shared configuration or supporting source.
- Historical and recovery material is excluded from this package.

## Build statement

The package is intended to contain the handwritten source and configuration
needed to inspect and modify the App, Android project, Studio, Launcher and Forge.
It does not contain downloaded dependencies or compiled build outputs.
A build still requires the normal local toolchain and dependency installation.

## Exclusion record

```json
{
  "generatedAndDependencyFolders": [
    "node_modules",
    "build",
    "dist",
    ".gradle",
    ".git",
    ".idea",
    "coverage",
    "cache",
    "tmp"
  ],
  "historicalAndRecoveryFolders": [
    "Archive",
    "backups",
    ".update-manager",
    "quarantine",
    "unnecessary"
  ],
  "exportFolders": [
    "AI/EXPORT"
  ],
  "oversizedFiles": "Files larger than 10485760 bytes"
}
```
