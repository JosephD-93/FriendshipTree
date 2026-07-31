# FriendshipTree — Start Here

This folder is the canonical context pack for continuing development of FriendshipTree in a fresh conversation.

## What FriendshipTree is

FriendshipTree is a React/Vite application packaged for Android with Capacitor. Its central feature is a visual social graph containing people, groups, links, calendar information, health trackers and an optional animated “living forest” presentation.

The project also includes a desktop development environment called FriendshipTree Studio and a launcher/update manager called Forge.

## The three active parts

1. **The app** — the React/Vite/Capacitor project currently stored at the FriendshipTree project root.
2. **FriendshipTree Studio** — the developer-facing desktop tooling.
3. **Forge** — launches Studio, manages installed Studio versions, installs update packages and supports rollback.

## Current update rule

Forge must check only:

`StudioSystem\Updates\Inbox`

It must not scan Downloads and it must not introduce another launcher, Core application or updater spin-off.

## Start a new conversation with

Upload this canonical documentation pack, the current Forge script, and the current source files relevant to the task. State which feature or fault is being worked on.

## Source-of-truth rule

Do not reconstruct files from old chat descriptions when the current file can be uploaded. Modify the exact current file whenever possible.

## Important status labels

- **Confirmed working** — personally tested by the user.
- **Implemented, untested** — code exists but has not been verified on the user's machine.
- **Planned** — agreed direction, not implemented.
- **Abandoned** — explicitly not part of the architecture.
