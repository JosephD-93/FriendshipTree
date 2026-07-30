# FriendshipTree Repository Audit — 29 July 2026

## Scope

This audit is based on the latest supplied FriendshipTree AI Workspace snapshot plus the live `git status` and `git ls-files` output supplied in chat. It does not claim that every file in the current Windows folder was opened individually.

## Confirmed Git state

- Repository: `JosephD-93/FriendshipTree`
- Branch: `main`
- Local and remote were synchronised after pushing the backup-location diagnostic change.
- Latest app source change was committed and pushed.
- The working tree still contains deliberate cleanup work: deleted legacy tracked files and untracked Studio/project folders.

## Confirmed tracked material needing cleanup

The repository has tracked several artefacts that are not canonical source:

- `FriendshipTree_FileList.txt`
- `android/FriendshipTree_FileList.txt`
- `ft_diag_log.txt`
- `gcal_filtered.txt`
- `gcal_log.txt`
- `src.zip`
- `src/App.jsx.backup`
- `src/App.jsx.bak`
- experimental source copies such as `src/claude1.jsx` and `src/claude again.jsx`

These should be reviewed and removed in an explicit repository-cleanup commit, not restored merely because Git reports them as deleted.

## Confirmed untracked project areas

- `AI/`
- `Assets/`
- `Docs/`
- `Documentation/`
- `FriendshipTreeLauncher/`
- `FriendshipTreeStudio/`
- `Scripts/`
- `StudioSystem/`
- `Tests/`
- `Tools/`
- `_V3_Documentation/`
- `src/ROADMAP.md`

These must not all be added blindly. `StudioSystem/` in particular mixes canonical bootstrap material with installed versions, update packages and runtime state.

## Snapshot findings

The supplied workspace confirms that:

- `FriendshipTreeStudio/` contains Electron source including `main.js`, `preload.js`, `renderer.js`, `index.html`, styles and self-test files.
- `FriendshipTreeLauncher/` contains Electron source and a delivery pipeline.
- `Tools/` contains at least the FriendshipTree Doctor and Project Brain tooling in later snapshots.
- `Scripts/` contains build and organisation scripts.
- `AI/` contains project instructions, architecture, current state, known issues, validation and file indexes.
- `Docs/` and `Documentation/` overlap and require comparison before consolidation.
- `StudioSystem/Versions/` contains many installed historical Studio copies and should remain outside Git.

## Immediate recommendation

1. Commit the updated `.gitignore` by itself.
2. Install the repository constitution and audit tool supplied with this package.
3. Run the audit tool against the live folder.
4. Review its generated report before staging any new top-level folder.
5. Add canonical source in small groups: Studio, Launcher, tools/scripts/tests, documentation/assets, then selected StudioSystem bootstrap files.

## Current risk level

**Moderate but controlled.** The app source is now backed up in GitHub, and the working folder is not broken. The main remaining risk is accidentally committing mixed runtime/archive material or deleting unique documentation without comparison.
