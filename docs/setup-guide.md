# Local Setup, Execution & Deployment Guide

This guide covers everything needed to run, test, and demonstrate the **Smart Bioinformatics Application for DNA Pattern Identification and Mutation Detection** on both Web and Android.

---

## 1. Prerequisites Check

Make sure you have:
- **Node.js (LTS v20+ or v24+)** with `npm`
- **Java Development Kit (JDK 17)**
- **Android Studio** (Koala / Ladybug or latest) with Android SDK API Level 34/35
- **Git**

---

## 2. Running the Next.js Scientific Web Dashboard

1. Open PowerShell and navigate to the web directory:
   ```powershell
   cd "c:\DNA Detection APP\web"
   ```

2. Start the development server:
   ```powershell
   npm run dev
   ```

3. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

4. Or to build and serve the production version:
   ```powershell
   npm run build
   npm run start
   ```

---

## 3. Opening & Running the Native Android Application

1. Launch **Android Studio**.
2. Select **Open** and choose the `c:\DNA Detection APP\android` directory.
3. Allow Gradle to sync dependencies (Android Studio will automatically download Jetpack Compose, Material 3, and Firebase Android BOM).
4. Run on an Android Emulator (API 34/35) or a physical Android phone with USB Debugging enabled:
   - Click the green **Run ▶** button in the toolbar.
5. To generate a Release or Debug APK from the command line:
   ```powershell
   cd "c:\DNA Detection APP\android"
   .\gradlew assembleDebug
   ```
   The generated APK will be located at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 4. Connecting Your Shared Firebase Project

Both the Web application and the Android application share the same Firebase backend.

### Step 4.1: Create Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it `dna-detection-app` (or any preferred name).
3. Under **Build**, enable:
   - **Authentication:** Enable *Email/Password* and *Google* providers.
   - **Cloud Firestore:** Create database in production mode.
   - **Cloud Storage:** Create default bucket.

### Step 4.2: Connect Web App
1. In Firebase Console, click the **Web icon (</>)** to register a web app.
2. Copy the config parameters into `web/.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyYourActualApiKey..."
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
   NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef..."
   ```

### Step 4.3: Connect Android App
1. In Firebase Console, click the **Android icon** to register an Android app.
2. Enter the Package Name: **`com.biotech.dnadetect`**.
3. Download the generated **`google-services.json`** file.
4. Replace the placeholder at:
   ```text
   c:\DNA Detection APP\android\app\google-services.json
   ```

### Step 4.4: Deploy Security Rules
In the `backend/` directory, run:
```powershell
firebase deploy --only firestore:rules,storage
```

---

## 5. Running Automated Bioinformatics Tests

To execute the 20-point automated bioinformatics validation test suite at any time:
```powershell
node "c:\DNA Detection APP\shared-engine\algorithms\test-bio-engine.js"
```
All tests should report:
`✔ ALL BIOINFORMATICS ENGINE TESTS PASSED SUCCESSFULLY! (20/20)`

