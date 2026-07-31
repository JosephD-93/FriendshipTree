# FriendshipTree AI Specification v1

This folder is the permanent canonical knowledge system for AI-assisted FriendshipTree development.

## Authority order

1. Exact current source files.
2. `AI_SPECIFICATION.md`
3. `MANIFEST.json`
4. `ARCHITECTURE.md`
5. `DEVELOPMENT_RULES.md`
6. `CURRENT_STATE.md`, `KNOWN_ISSUES.md`, `NEXT_TASKS.md`
7. Historical handovers and chat summaries.

## Permanent AI subsystem

Canonical files live in:

`C:\Users\Joe\FriendshipTree\AI`

Exports live in:

`C:\Users\Joe\FriendshipTree\AI\EXPORT`

The canonical AI files remain in the project. Export packages are disposable snapshots generated from them and current source.

## Required maintenance

Whenever a change affects architecture, package formats, file locations, build commands, persistence, update safety or system responsibilities:

1. update the relevant canonical AI document;
2. add a dated entry to `CHANGELOG.md`;
3. refresh and validate the AI workspace;
4. replace stale files in the ChatGPT Project.

## Missing-file workflow

A ChatGPT Project cannot directly read the local Windows filesystem. It must request the exact canonical path. The Launcher action **Export requested file** creates an upload copy and receipt without altering the source.