# FriendshipTree Electron Launcher 1.0.0

This is a modern frontend for the existing PowerShell Forge engine.

Version 1.0.0 deliberately keeps high-risk update and recovery operations inside the proven Forge interface. The modern launcher handles everyday launching, project navigation, system status, installed-version launching, and recent logs.

Version 1.0.4 opens the canonical `START FRIENDSHIPTREE FORGE.cmd` command for
update and recovery controls. This uses the same verified route as launching the
command manually and reports a visible error if Windows cannot open it.

Version 1.0.5 lowers the Launcher's minimum window dimensions so Windows can
snap it into either half of a standard 1920-pixel display. The existing
responsive layout takes over automatically at the narrower snapped width.

Version 1.0.6 lowers the native minimum dimensions further so Windows can use
an exact half-screen snap at common 125% and 150% display scaling levels. It
also adds a compact responsive layout for those narrower logical widths.

Version 1.0.7 adds a controlled GitHub backup panel. It previews and explicitly
selects changes, excludes runtime and generated paths, checks that the remote is
not ahead, creates a descriptive commit, and uses a normal non-forced push.

Version 1.0.9 synchronises the confirmed Forge Studio slot into the canonical
`FriendshipTreeStudio` source before GitHub preview, and excludes AI exports,
runtime versions, bootstrap backups and generated folders from selection.

The installer searches for an existing Electron runtime in the FriendshipTree project and creates permanent Desktop and Start Menu shortcuts.
