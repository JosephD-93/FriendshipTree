# Feature Status

**Last updated:** 2026-08-01
**Rule:** This file must not mark a feature as tested without evidence from the current app or user verification.

| Area | Feature | Status | Evidence / next check |
|---|---|---|---|
| Social | People and group social graph | Tested historically; current review advised | Core app has been used successfully, but current source should be checked before major edits. |
| Social | Photos on people | Implemented; persistence needs review | Photos use IndexedDB/filesystem-related handling; restore behaviour has previously failed. |
| Social | Multi-contact import | Planned | Agreed onboarding feature. |
| Social | Flashing Add Contacts onboarding node | Planned | Intended for blank accounts. |
| Health | Health-list circular controls | Tested historically | User confirmed core interactions worked. |
| Health | Variable columns and draggable lists | Implemented; current review advised | Past runtime errors occurred around list movement. |
| Health | Previous-day padlock editing | Tested historically | User reported it worked very well. |
| Widgets | Health tracker Android widget | Android 4.3 implemented; device test required | Responsive circular controls, per-widget tracker selection, 1–8 rows, 1–6 columns, list switching and resize-aware sizing. |
| Widgets | Daily-use mascot widget | Planned | Mole mascot direction agreed. |
| Mascots | Mole character family | Design direction confirmed | Social, health and knowledge variants; pink noses; avoid visible mouths/teeth. |
| Mascots | Lottie animation page/assets | Planned or partial | Exact current asset integration must be inspected. |
| Navigation | Click-to-pan camera navigation | Implemented or partial; untested | User was unable to test at the time. |
| Navigation | Nearby directional controls | Planned or partial | Verify current source. |
| Fancy map | Vines | Performance improved historically | Later benchmarks showed major improvement. |
| Fancy map | Group-border leaves | Performance improved historically | Previously the largest performance offender. |
| Fancy map | Butterflies | Implemented; expensive | Requires performance controls. |
| Fancy map | Night fireflies and dark mask | Implemented or partial; expensive | Combined effect historically caused lag. |
| Fancy map | Bats, swifts, pollen and owl shadow | Planned | Ambience direction agreed. |
| Performance | Feature toggles and benchmark tools | Implemented historically | Current source should be checked. |
| Performance | Clear benchmark data | Implemented historically | Verify current build. |
| Storage | Local app persistence | Needs review | Historical data-loss issue after closing app. |
| Storage | Capacitor Preferences backup layer | Partial | Reported as used only in limited save paths. |
| Backup | Manual export/share | Implemented historically | JSON export worked; photos did not restore. |
| Backup | Automatic local backups | Planned / next app priority | User selected this as a major task. |
| Backup | Google Drive backup | Planned | One-tap and automatic nightly direction discussed. |
| Restore | Restore photos and data together | Needs work | Historical import restored data but not photos. |
| Android | Build and install through Gradle/ADB | Tested historically; 4.3 not yet tested | Existing workflow has worked. The new responsive widget build must pass independently. |
| Studio | Canonical documentation | Tested | Installed into project on 2026-07-22. |
| Studio | Developer Hub / Mission Control | Planned; current priority | Intended next Studio feature. |
| Studio | Export AI context pack | Planned | This pack is currently manual. |
| Forge | Inbox-only update architecture | Implemented | Current intended Forge is Inbox-only. |
| Forge | End-to-end package install | Needs testing | Immediate roadmap priority before more updater work. |
| Forge | Downloads scanning | Abandoned | Must not be reintroduced. |
| Architecture | FriendshipTree Core | Abandoned | Must not be revived. |

## Current priority

1. Complete canonical documentation and context-pack workflow.
2. Build the first Developer Hub page in Studio.
3. Prove the Forge Inbox workflow with a harmless package.
4. Build, install and phone-test Android 4.3 responsive configurable health widgets and rollover repair.
5. Return to app storage and backup reliability.
