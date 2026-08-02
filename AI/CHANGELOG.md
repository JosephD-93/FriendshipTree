# AI Subsystem Changelog

## 2026-07-23
- Created the permanent FriendshipTree AI subsystem.

## 2026-08-02
- Hardened the GitHub Android build against unusable cloud APKs. Main-branch builds now require the established FriendshipTree signing certificate, explicitly sign the finished APK with the encrypted laptop keystore, and verify the final APK fingerprint before upload or Release publication.
- The required SHA-256 signing certificate is `D2:D6:C2:89:FE:DB:1B:0D:DD:55:80:9C:E6:A2:D7:8E:96:FA:99:F9:07:00:85:05:3A:37:28:C3:39:FF:F8:13`.
- Corrected the final-APK fingerprint parser so both `Signer #1 certificate SHA-256 digest:` and `V2 Signer: certificate SHA-256 digest:` output formats yield the hexadecimal digest rather than the label text.
- Updated checkout, Node setup and Java setup to their Node 24-based v5 actions. The app build continues to use Node.js 20 to avoid changing application dependencies during this focused CI repair.
