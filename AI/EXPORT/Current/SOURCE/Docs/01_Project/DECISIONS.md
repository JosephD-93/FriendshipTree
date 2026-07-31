# Decisions

## Permanent architecture

Keep only:

- FriendshipTree app
- FriendshipTree Studio
- Forge
- `StudioSystem\Updates\Inbox`

Do not create another Core, updater application, launcher or parallel project.

## Update workflow

The agreed workflow is:

1. create a valid `.ftupdate` package;
2. place it directly into `StudioSystem\Updates\Inbox`;
3. open Forge;
4. Forge validates and installs it;
5. test the candidate;
6. confirm it or roll back.

Forge must not depend on the browser Downloads folder.

## File handling

- Modify exact current files instead of reconstructing them.
- Keep historical output, but separate it from editable source.
- Preserve uncertain files in Archive rather than deleting them silently.
- Generated output is not source code.
- Do not move the React/Capacitor app into a new `App` subfolder until all Vite, Capacitor, Android, script and documentation paths are deliberately updated and tested.

## Documentation

These canonical documents replace scattered handovers:

- `START-HERE.md`
- `CURRENT-STATUS.md`
- `PROJECT-HANDBOOK.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `KNOWN-ISSUES.md`
- `DECISIONS.md`
- `FILE-MANIFEST.md`
