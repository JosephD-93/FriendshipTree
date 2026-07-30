# FriendshipTree Repository Constitution

**Status:** Draft 1  
**Project:** FriendshipTree  
**Purpose:** Define what belongs in the canonical Git repository and how project material is classified.

## 1. Canonical repository

The canonical source repository is:

`https://github.com/JosephD-93/FriendshipTree`

The local working copy is expected at:

`C:\Users\Joe\FriendshipTree`

GitHub records tested source history. The local folder may also contain generated builds, archives, diagnostics and runtime state that must not be committed automatically.

## 2. Core rules

1. Never use `git add .` at the project root.
2. Add source folders and files deliberately.
3. Keep generated builds, caches, runtime state, downloaded packages and archives out of Git.
4. Do not move active source folders until all dependent build scripts, workflows and paths are updated together.
5. A commit should represent one coherent change and should build successfully before being pushed.
6. Never overwrite uncommitted work during pull, update, repair or rollback operations.
7. Repository cleanup must preserve history; obsolete tracked files should be removed in an explicit cleanup commit.

## 3. Classification

### Track in Git

| Path | Classification | Purpose |
|---|---|---|
| `.github/` | Automation source | GitHub Actions and repository automation |
| `src/` | App source | React application source and app roadmap |
| `public/` | App source | Web manifest, service worker and public assets |
| `android/` | Native source | Capacitor Android project and native configuration |
| `FriendshipTreeStudio/` | Studio source | Active FriendshipTree Studio application |
| `FriendshipTreeLauncher/` | Launcher source | Active launcher application |
| `Scripts/` | Developer source | Build, organisation and maintenance scripts |
| `Tools/` | Developer source | Project Doctor, Project Brain and audit tools |
| `Tests/` | Test source | Automated and manual test definitions |
| `AI/` | Project knowledge | Canonical AI workspace source documents, not generated exports |
| `Docs/` | Documentation | Current handbook, roadmap, changelog and specifications |
| `Assets/` | Source assets | Original icons, illustrations and reusable design assets |
| Root build files | Build source | `package.json`, lockfile, Vite, Capacitor and CSS tool configuration |

### Review before tracking

| Path | Reason |
|---|---|
| `StudioSystem/` | Contains both useful bootstrap/configuration and runtime versions/state; only canonical source/bootstrap files should be tracked |
| `Documentation/` | May duplicate `Docs/`; merge deliberately after comparison |
| `_V3_Documentation/` | Historical or migration documentation; review for unique material before merging |

### Keep local and ignore

| Path | Reason |
|---|---|
| `.studio/` | Generated Project Brain indexes, reports, test results and runtime state |
| `.friendshiptree/` | Local runtime state |
| `.cleanup-audit/` | Generated audit output |
| `.migration-v3/` | Temporary migration state |
| `.friendshiptree-patches/` | Temporary patches |
| `Generated Builds/` | APKs and build outputs |
| `Packages/` | Generated update packages |
| `downloads/` | Incoming and temporary downloads |
| `Archive/` | Historical snapshots and superseded material |
| `StudioSystem/Versions/` | Installed/versioned runtime copies, not canonical source |
| `StudioSystem/Updates/` | Incoming/applied update packages |
| `node_modules/`, `dist/`, Android build folders | Reproducible generated output |

## 4. Source-of-truth precedence

When copies conflict, use this order:

1. Tested local working source with uncommitted changes.
2. Latest local Git commit.
3. Latest pushed GitHub commit.
4. Canonical active Studio/Launcher source folders.
5. AI Workspace export or project snapshot.
6. Archives, backups and generated packages.

A lower-priority copy must never silently replace a higher-priority one.

## 5. Commit policy

Recommended commit sequence:

1. Inspect `git status`.
2. Stage only the intended files.
3. Review `git diff --cached --stat` and `git diff --cached`.
4. Build and run relevant tests.
5. Commit with a specific message.
6. Push to `origin/main` only after the tested commit is complete.

## 6. Release policy

A release should record:

- app or Studio version;
- source commit hash;
- build result;
- test result;
- APK/update package location;
- release notes;
- rollback target.

Studio may automate this later, but it must remain truthful: a release is not reported as installed or verified until the device/version check succeeds.

## 7. Repository health goals

- No unexpected untracked source files.
- No generated binaries or logs tracked in Git.
- Current README, handbook, roadmap and changelog present.
- Active Studio and Launcher source represented once.
- Every release linked to a commit.
- No destructive Git operation without an explicit backup and warning.
