# Studio and Forge Handover

## Source of truth

- Forge is the only Studio launcher and Studio version manager.
- Forge reads update packages only from `StudioSystem\Updates\Inbox`.
- Studio updates are delivered as `.ftupdate` files and are never extracted manually by the user.
- Do not create another updater, launcher, Core application or parallel Studio project.
- Modify the exact current source files whenever they are available.

## Mandatory update-package contract

Every Studio update must be checked against the current Forge source before it is given to the user.

The current Forge package contract is:

- archive extension: `.ftupdate`
- root manifest filename: `manifest.json`
- manifest `format`: `friendshiptree-update-v1`
- manifest `type`: `studio`
- root payload directory: `payload`
- `requiredFiles` lists mandatory payload files
- `checksums` contains SHA-256 hashes using payload-relative paths
- required Studio files normally include `package.json`, `main.js`, `preload.js`, `renderer.js`, `index.html` and `styles.css`

Before delivery, verify:

1. `manifest.json` exists at the archive root.
2. Every required file exists inside `payload`.
3. Every declared SHA-256 checksum matches.
4. The version is new and safe.
5. The package installs beside the working version rather than overwriting it.
6. Instructions say to save the package directly to `StudioSystem\Updates\Inbox`.
7. Instructions never ask the user to extract a Studio update.

Never infer or invent the package format. If the current Forge source is unavailable, stop and obtain it.

## Studio version display

The interface must show a real packaged version immediately. It may refresh that value from Electron, but a failed IPC call must never leave the permanent word “loading…” visible.

## Safe workflow testing

Studio and Forge may create harmless workflow-test packages. A test package must:

- create a new isolated candidate version;
- leave the confirmed working version untouched;
- contain a clear test marker;
- use the exact current Forge manifest and checksum rules;
- be written directly to `StudioSystem\Updates\Inbox`.

## Status as of Studio 2.8.1

- Developer Hub interface: implemented.
- Forge package installation through the canonical Inbox: confirmed working by the user for Studio 2.8.0.
- Permanent version-placeholder fix: implemented in 2.8.1.
- Studio “Create safe Forge test update” action: implemented in 2.8.1.
