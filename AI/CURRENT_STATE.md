# Current State

Generated from the live project: 31/07/2026, 11:33:32

- Canonical root: `C:\Users\Joe\FriendshipTree`
- Canonical AI folder: `C:\Users\Joe\FriendshipTree\AI`
- Meaningful source and documentation files indexed: 1117
- App files: 20
- Android files: 42
- Studio files: 415
- Launcher files: 17
- Forge files: 3
- Current export folder: `C:\Users\Joe\FriendshipTree\AI\EXPORT\Current`
- Current transport ZIP: `C:\Users\Joe\FriendshipTree\AI\EXPORT\FriendshipTree-AI-Workspace.zip`

The Launcher is included as exact current source. Its inclusion does not claim
that laptop behaviour has been verified. Launcher source `1.1.0` adds Android
SDK/ADB discovery, a pre-build authorised-phone check and retryable APK delivery.

Generated folders, dependencies, archives and build outputs are deliberately excluded.
See SOURCE_COVERAGE.md and FILE_INDEX.json for exact coverage and proof.

Behavioural status must still be confirmed against source and real test results.

## GitHub Android delivery repair — 2026-08-02

The canonical `.github/workflows/android-build.yml` now verifies the encrypted
keystore and the final published APK against the certificate already installed
on the phone. Main-branch publication must stop if either fingerprint differs.
The workflow repair is source-validated; a fresh GitHub Actions run and phone
update remain required for end-to-end confirmation.
