FRIENDSHIPTREE FORGE FOUNDATION 1

This is the clean foundation only.

It creates:
C:\Users\Joe\FriendshipTree\StudioSystem
  Bootstrap
  Versions
  SharedData
  Backups
  Logs
  Updates\Inbox
  Updates\Installed
  Updates\Rejected
  studio-state.json

It copies the existing FriendshipTreeStudio folder into:
StudioSystem\Versions\legacy-current

That protected copy becomes both:
- current
- lastGood

The stable Forge launcher is PowerShell/Windows Forms, not Electron. Therefore a
broken Studio update cannot break the launcher used to roll it back.

INSTALL
1. Extract this ZIP.
2. Double-click INSTALL FORGE FOUNDATION.cmd.
3. Use the new "FriendshipTree Forge" shortcut placed on the Desktop.

Do not move or delete old archives yet. Forge Foundation does not delete anything.
