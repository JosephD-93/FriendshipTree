# FriendshipTree → Android (Capacitor) build steps

These run on the **laptop**. Your phone test loop is unchanged
(edit via github.dev → push → GitHub Pages rebuilds → test at
https://josephd-93.github.io/FriendshipTree/).

You only do this when you want to ship a new version to the Play Store.

------------------------------------------------------------
## ONE-TIME SETUP (do this once)
------------------------------------------------------------

### 1. Install tools on the laptop
- Node.js 20+   → https://nodejs.org  (LTS)
- Android Studio → https://developer.android.com/studio
  (during install let it download the Android SDK + build tools)

### 2. Get the project onto the laptop
```bash
git clone https://github.com/JosephD-93/FriendshipTree.git
cd FriendshipTree
npm install
```

### 3. Add Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
```

### 4. Add the config + android platform
- Make sure capacitor.config.json (provided) is in the project root.
- Then:
```bash
npx cap add android
```
This creates an /android folder (the native project). Commit it to
the repo so you don't have to regenerate it.

------------------------------------------------------------
## EVERY TIME YOU SHIP AN UPDATE
------------------------------------------------------------

### 1. Pull the latest tested code from GitHub
```bash
git pull
```

### 2. Build the web app WITH RELATIVE PATHS (important for Capacitor)
GitHub Pages needs base '/FriendshipTree/', but the bundled app needs
relative paths. Build with an override so we don't touch your normal config:
```bash
npx vite build --base=./
```
This produces /dist with relative asset paths.

### 3. Copy the web build into the native app
```bash
npx cap copy android
```

### 4. Open in Android Studio
```bash
npx cap open android
```

### 5. Bump the version (every Play Store upload needs a higher number)
In android/app/build.gradle, increase:
  - versionCode  → must go UP by 1 each upload (1, 2, 3...)
  - versionName  → the FriendshipTree version users see ("3.2", "3.3"...)

### 6. Build the signed app bundle (.aab)
In Android Studio:
  Build → Generate Signed Bundle / APK → Android App Bundle
  - First time: create a new keystore. SAVE THIS FILE + PASSWORDS
    SOMEWHERE SAFE. Losing it means you can never update this app
    listing again. (Or enable Play App Signing so Google holds the key.)
  - Output is an .aab file.

### 7. Upload to Play Console
  - play.google.com/console → your app → Production (or Closed testing first)
  - Upload the .aab, fill release notes, submit.

------------------------------------------------------------
## FIRST RELEASE ONLY — the 12-tester / 14-day rule
------------------------------------------------------------
New developer accounts must run a CLOSED TEST before production:
  - At least 12 testers opt in via a test link
  - They must keep it installed 14 consecutive days
  - Then you can apply for production access
This is one-time. Later updates go straight to production.

------------------------------------------------------------
## NOTES
------------------------------------------------------------
- netlify.toml can be deleted from the repo — it does nothing now.
- App ID is io.github.josephd93.friendshiptree and is PERMANENT once
  published. Users never see it; they see "FriendshipTree".
- The bundled app works offline. Your GitHub Pages site stays your
  live test environment.
