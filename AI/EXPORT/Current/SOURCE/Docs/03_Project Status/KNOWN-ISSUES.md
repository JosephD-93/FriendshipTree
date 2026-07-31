# Known Issues

## Forge/update system

- The full Inbox package installation workflow has not yet been proven end to end with the current Forge.
- Several abandoned installer/Core experiments failed and must not be revived accidentally.
- The current architecture must not scan Downloads.

## Storage and backup

Historical problems included:

- Android changes appearing to work during a session but disappearing after the app was closed;
- a save indicator remaining red;
- warning that persistent storage was denied by Android;
- imports restoring data but not photos;
- backup controls producing no visible confirmation in some builds;
- need for backups that survive app uninstall.

The exact current status must be verified in the current source and on the phone.

## Performance

Fancy-map effects can significantly reduce performance, especially:

- group border leaves;
- butterflies;
- firefly/night combinations.

## Previously observed runtime errors

Errors reported during development included:

- `healthlistmembers is not defined`
- `Cannot access 'gd' before initialization`
- `Cannot access 'Zn' before initialization`
- `TypeError: o is not a function`

Do not assume these still exist. Search the current source and reproduce before fixing.

## Organisation

`FriendshipTreeStudio`, `StudioSystem` and `Tools` remain separate active-looking locations. Their exact ownership and overlap still require inspection before any structural move.
