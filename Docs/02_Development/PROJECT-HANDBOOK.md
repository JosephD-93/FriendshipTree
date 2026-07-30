# Project Handbook

## Working method

1. Establish the exact current file before editing.
2. Make one contained change.
3. build;
4. install or launch;
5. test on the actual target;
6. record the result;
7. only then continue.

Avoid large speculative rewrites and new architectural layers in response to a local fault.

## Android build context

Typical project location:

`C:\Users\Joe\FriendshipTree`

Common build sequence used during development:

```powershell
npm run build
npx cap copy android
cd android
.\gradlew assembleDebug
```

Commands must be run from the correct folder. A missing `package.json` usually means PowerShell is in the wrong directory.

## Data safety

Before storage migrations or structural changes:

- create an export;
- retain the previous working app build;
- do not assume uninstall-safe storage;
- verify photos as well as JSON state;
- test closing and reopening the Android app, not merely minimising it.

## Performance work

The fancy map has historically been far more demanding than the simple map.

Major measured performance offenders included:

- group-border leaves;
- animated butterflies;
- vines before simplification;
- dark-mask plus fireflies.

Performance changes must be benchmarked feature by feature rather than judged only by appearance.

## UI direction

The app should feel organic and supportive, not as though non-flourishing relationships are dying.

Mascot direction:

- mole characters;
- pink noses;
- no visible mouths or teeth;
- emotion conveyed through eyes, eyebrows, poses and movement;
- subtle role variants such as social, health and knowledge moles.

## Change control

Every significant change should be recorded in `CHANGELOG.md`.

Every decision that future work must not reverse casually should be recorded in `DECISIONS.md`.
