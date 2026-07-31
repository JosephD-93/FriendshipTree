# File Manifest

## Keep active at project root

```text
.friendshiptree
.git
.github
.gitignore
.studio
android
FriendshipTreeStudio
index.html
package.json
package-lock.json
postcss.config.js
public
src
StudioSystem
tailwind.config.js
Tools
vite.config.js
capacitor.config.json
```

## Canonical organisation folders

```text
Archive
Assets
Docs
Generated Builds
Packages
Scripts
Tests
```

## Current Forge source of truth

Expected live file:

`StudioSystem\Bootstrap\FriendshipTree-Forge.ps1`

Canonical reference copy in this pack:

`Studio\Forge\FriendshipTree-Forge.ps1`

## Files not required in a fresh conversational upload

Usually exclude unless directly relevant:

- `node_modules`
- `.gradle`
- `android\app\build`
- large generated APK/output folders
- the whole Archive
- unrelated screenshots
- superseded ZIP packages

## Files to upload for a normal source-editing task

- canonical `Docs` folder;
- exact source file being changed;
- closely related components/configuration;
- current error text or screenshot;
- current Forge script when working on Forge;
- package manifest and builder code when working on updates.
