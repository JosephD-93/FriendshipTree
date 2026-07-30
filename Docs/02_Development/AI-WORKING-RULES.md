# AI Working Rules

**Version:** 1.0  
**Applies to:** ChatGPT, Claude, Gemini and any other AI assisting with FriendshipTree.

## First action in a new conversation

Read, in this order:

1. `00_Start Here/START-HERE.md`
2. `00_Start Here/DEVELOPER-DASHBOARD.md`
3. `03_Project Status/CURRENT-STATUS.md`
4. `02_Development/FEATURE-STATUS.md`
5. `03_Project Status/KNOWN-ISSUES.md`
6. `01_Project/DECISIONS.md`
7. the exact source files relevant to the task.

Do not assume chat history is more current than these files.

## Source-of-truth rules

- Modify the exact current file whenever it is available.
- Never reconstruct a large source file from memory or an old chat summary.
- Do not claim a feature exists until the current source or a test confirms it.
- Distinguish clearly between planned, implemented, tested and abandoned.
- Treat minified names from runtime errors as symptoms, not reliable source identifiers.

## Architecture rules

The permanent high-level structure is:

- FriendshipTree app;
- FriendshipTree Studio;
- Forge;
- `StudioSystem\Updates\Inbox`.

Do not introduce:

- FriendshipTree Core;
- another updater;
- another launcher;
- Downloads scanning;
- parallel replacement Studio projects.

Do not move `src`, `public`, `android` or root build configuration into a new app folder unless every dependent path is deliberately updated and tested.

## Change discipline

For each contained change:

1. identify the exact file;
2. explain the intended result;
3. make the smallest viable change;
4. build;
5. test on the real target;
6. record the result;
7. continue only after the result is known.

Avoid combining unrelated fixes.

## Data-safety rules

Before persistence, import, restore or storage work:

- preserve a working backup;
- preserve a known working APK where possible;
- verify structured data and photos separately;
- test after fully closing and reopening the Android app;
- never assume uninstall-safe storage;
- avoid destructive migrations without rollback.

## Performance rules

- Benchmark visual features independently.
- Do not judge performance only by visual smoothness during a short manual test.
- Preserve the simple map as a reliable fallback.
- Treat group-border leaves, butterflies and night effects as historically expensive until current measurements show otherwise.
- Avoid adding constant animation to distant or invisible objects.

## UI and product rules

- Follow `PROJECT-BIBLE.md`.
- Encourage without shame.
- Avoid visual language of dying relationships.
- Keep the experience calm and organic.
- Use mole-family design rules consistently.
- Never let decorative animation hide controls or information.

## Documentation rules

After a significant change, update the relevant files:

- `CHANGELOG.md`;
- `CURRENT-STATUS.md`;
- `FEATURE-STATUS.md`;
- `KNOWN-ISSUES.md`;
- `TESTING.md`;
- `DECISIONS.md` when a permanent choice is made;
- `DEVELOPER-DASHBOARD.md` for current task and next action.

Do not rewrite documentation to imply unverified success.

## Communication rules

- Give exact paths and exact commands.
- Use placeholders only when clearly labelled.
- Do not tell the user a file was created unless a downloadable file was actually produced.
- When uncertain, inspect first.
- Avoid speculative architectural additions in response to a local problem.
- State failures honestly.

## Completion labels

Use these meanings consistently:

- **Planned** — agreed direction; no confirmed code.
- **In progress** — active work is underway.
- **Implemented, untested** — code exists but has not been verified.
- **Tested** — user or repeatable test confirmed it.
- **Needs review** — current source or behaviour is unclear.
- **Blocked** — cannot proceed until a dependency or fault is resolved.
- **Abandoned** — explicitly excluded from the architecture.
