# Developer Dashboard

**Documentation version:** 1.0  
**Last updated:** 2026-07-22  
**Project root:** `C:\Users\Joe\FriendshipTree`

## Current state

| Item | Status |
|---|---|
| Project structure | Organised |
| Canonical documentation | Installed and being completed |
| Active app source | Repository root |
| Studio | Present in `FriendshipTreeStudio` |
| Forge | Intended live copy in `StudioSystem\Bootstrap` |
| Forge update source | `StudioSystem\Updates\Inbox` only |
| Developer Hub | Planned; next Studio feature |
| Forge end-to-end test | Not yet completed |
| Storage durability | Needs current Android verification |
| Backup with photo restore | Needs work |

## Current priority

Complete the documentation system and create an easy AI context-pack workflow.

## Immediate next actions

1. Install this Documentation Completion Pack.
2. Verify the new organised `Docs` structure.
3. Open `FEATURE-STATUS.md` and correct any status that current source disproves.
4. Begin Developer Hub Version 1 with folder-opening and status actions.
5. Test Forge with one harmless Inbox package before changing updater architecture.
6. Return to app backup and persistence reliability.

## Current blockers

- Exact current app version is not documented.
- Latest successful APK path and timestamp are not documented.
- Current Git branch/commit are not documented.
- Forge package flow is unproven.
- Current storage behaviour has not been freshly tested.

## Session close checklist

Before ending a major development session:

- update `CURRENT-STATUS.md`;
- update `FEATURE-STATUS.md`;
- record test evidence in `TESTING.md`;
- update `CHANGELOG.md`;
- add unresolved faults to `KNOWN-ISSUES.md`;
- update this dashboard's current priority and next action;
- export a new context pack when the state has materially changed.

## Context-pack instruction

For a fresh AI conversation, provide:

- the contents of `Docs`;
- the exact source files relevant to the task;
- current errors or screenshots;
- the current Forge file for Forge work;
- package manifests/builders for update-package work.

Do not upload `node_modules`, Gradle caches, the entire Archive or unrelated generated builds.
