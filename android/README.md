# GenomicsAI — Native Android Application

**Smart Bioinformatics Application for DNA Pattern Identification and Mutation Detection**

This is a production-quality, **100% native Android application** written in Kotlin using Jetpack Compose, Material 3, and modern MVVM architecture. It communicates with the same Python FastAPI backend and synchronizes with the same Firebase Authentication and Cloud Firestore database as the web application.

---

## 1. Technology Stack & Architecture

- **Language:** Kotlin 1.9+
- **UI Toolkit:** Jetpack Compose (BOM 2024.09.02) with Material 3 components
- **Architecture:** Model-View-ViewModel (MVVM) + Repository Pattern
- **Asynchronous Operations:** Kotlin Coroutines (`Dispatchers.IO`, `viewModelScope`) and reactive `StateFlow`
- **Navigation:** Android Jetpack Navigation Compose
- **Networking:** Retrofit 2.11 + OkHttp3 + Gson (configurable endpoint: `http://10.0.2.2:8000/` for emulator or local IP for physical devices)
- **Database & Auth:** 
  - Firebase Authentication (Email/Password, Session Persistence, Password Reset, Guest/Demo Mode)
  - Firebase Cloud Firestore (Real-time synchronization under `/users/{userId}/analyses/{analysisId}`)
- **File System:** Android Storage Access Framework (SAF) for `.fasta`, `.fa`, `.fna` imports, and native Android Share Sheet for PDF/CSV report exports

---

## 2. Feature-Parity Checklist: Web vs. Native Android

| Module / Capability | Web Application | Native Android App | Implementation Status | Scientific Engine Source |
|---|---|---|---|---|
| **Branding & Theme** | Emerald Teal (`#0D9488`), Navy (`#0A192F`), Base Colors | Matching Material 3 Theme (`Color.kt`) | **Full Parity** | Native Compose Design System |
| **Authentication** | Firebase Auth (Login, Register, Demo) | Firebase Auth (`AuthViewModel`, `AuthScreen`) | **Full Parity** | `FirebaseAuth` + Demo Mode |
| **Cloud Firestore** | Collections under `/users/{uid}/analyses` | Real-time Flow under `/users/{uid}/analyses` | **Full Parity** | `FirebaseFirestore` SDK |
| **KMP Pattern Search** | Exact pattern matching + LPS table | `BioEngine.kmpSearch()` with LPS table viewer | **Full Parity** | Deterministic KMP Algorithm |
| **Boyer-Moore Search** | Bad character heuristic & sublinear shifts | `BioEngine.boyerMooreSearch()` with shift table | **Full Parity** | Deterministic Boyer-Moore |
| **Suffix Array & LCP** | Kasai algorithm, repeat elements, LRS | `BioEngine.suffixArrayRepeatAnalysis()` | **Full Parity** | Suffix Array + Kasai LCP |
| **K-mers & Entropy** | Sliding window counts & Shannon entropy | `BioEngine.calculateKmerFrequencies()` | **Full Parity** | Information Theory ($H = -\sum p \log_2 p$) |
| **Mutation Detection** | Needleman-Wunsch pairwise global alignment | `BioEngine.needlemanWunsch()` + Backend API | **Full Parity** | Global DP Matrix + HGVS Normalization |
| **Alignment Blocks** | Formatted 60-bp columns with match string | Native 60-bp blocks in `MutationDetectionScreen` | **Full Parity** | Formatted Block Builder |
| **HGVS Nomenclature** | SNVs (`c.20A>T`), Indels (`del`, `ins`) | Automated 3-prime normalized HGVS calling | **Full Parity** | Official HGVS Standards |
| **Clinical Benchmarks** | HBB (Sickle Cell), BRCA1, CFTR | 1-Click Preset Chips on Dashboard & Screens | **Full Parity** | Authoritative NCBI/ClinVar Benchmarks |
| **FASTA File Import** | Single and multi-sequence parser | SAF System File Picker (`FastaScreen.kt`) | **Full Parity** | Native Multi-Record Parser |
| **6-Frame Translation** | Reading frames +1..+3, -1..-3 & ORFs | `TranslationScreen.kt` with Tabbed Frames | **Full Parity** | Standard NCBI Genetic Code Table 1 |
| **Analysis History** | Filterable list, detail modal, delete | `HistoryScreen.kt` with Search, Tabs, Modal | **Full Parity** | Firestore Real-Time Snapshot Flow |
| **Report Exporting** | CSV and PDF export | Native Android Share Sheet (CSV & Text) | **Full Parity** | `FileUtils.kt` + Android Intent |
| **Backend Integration** | FastAPI port 8000 | Retrofit client (`BioApiClient`) + Health Probe | **Full Parity** | Configurable Server Endpoint |
| **Offline Resilience** | Local Engine Mode | Native in-app bio-engine automatic fallback | **Full Parity** | Zero external dependencies when offline |

---

## 3. Project Directory Structure

```
android/
├── app/
│   ├── build.gradle.kts                   # Application dependencies (Compose, Firebase, Retrofit)
│   ├── google-services.json               # Firebase configuration (Project: dna-detection)
│   ├── proguard-rules.pro                 # Release obfuscation rules
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml        # Cleartext traffic, Internet, launcher configuration
│       │   ├── java/com/biotech/dnadetect/
│       │   │   ├── data/
│       │   │   │   ├── api/
│       │   │   │   │   └── BioApiService.kt       # Retrofit REST interface & BioApiClient
│       │   │   │   ├── model/
│       │   │   │   │   └── AnalysisRecord.kt      # Cloud Firestore data model (@IgnoreExtraProperties)
│       │   │   │   └── repository/
│       │   │   │       └── FirebaseRepository.kt  # Auth & Firestore data access layer
│       │   │   ├── domain/
│       │   │   │   ├── BioEngine.kt               # Deterministic bioinformatics algorithms
│       │   │   │   ├── BioModels.kt               # Clean domain data classes
│       │   │   │   └── DnaEngine.kt               # Facade adapter for legacy callers
│       │   │   ├── presentation/
│       │   │   │   ├── MainActivity.kt            # Compose edge-to-edge root activity
│       │   │   │   ├── navigation/
│       │   │   │   │   └── NavGraph.kt            # Navigation Compose & bottom navigation bar
│       │   │   │   ├── screens/
│       │   │   │   │   ├── DashboardScreen.kt     # App overview, quick modules, clinical cases
│       │   │   │   │   ├── PatternAnalysisScreen.kt # KMP, Boyer-Moore, Suffix Array, K-mers
│       │   │   │   │   ├── MutationDetectionScreen.kt # Alignment, visual blocks, HGVS, export
│       │   │   │   │   ├── FastaScreen.kt         # SAF file importer & multi-record parser
│       │   │   │   │   ├── TranslationScreen.kt   # Six reading frames & candidate ORFs
│       │   │   │   │   ├── HistoryScreen.kt       # Cloud Firestore records, search, inspection
│       │   │   │   │   ├── SettingsScreen.kt      # Backend URL config, server probe, sign out
│       │   │   │   │   └── AuthScreen.kt          # Sign in, register, password reset, demo mode
│       │   │   │   ├── theme/
│       │   │   │   │   ├── Color.kt               # Scientific palette matching web application
│       │   │   │   │   ├── Theme.kt               # Material 3 light/dark dynamic theming
│       │   │   │   │   └── Type.kt                # Typography configuration
│       │   │   │   └── viewmodel/
│       │   │   │       ├── AnalysisViewModel.kt   # Central state holder for all analyses
│       │   │   │       └── AuthViewModel.kt       # User authentication and session management
│       │   │   └── utils/
│       │   │       └── FileUtils.kt               # File importer and CSV/Text Share Sheet exporter
│       │   └── res/
│       │       └── values/strings.xml             # Application name & strings
│       └── test/java/com/biotech/dnadetect/
│           └── BioEngineTest.kt                   # 10 comprehensive unit tests for algorithms
├── build.gradle.kts                       # Root Gradle project configuration
├── settings.gradle.kts                    # Root settings and module inclusion
├── gradlew.bat                            # Windows Gradle wrapper script
├── gradlew                                # Unix Gradle wrapper script
└── build_and_run.bat                      # One-click test and APK assembly script
```

---

## 4. How to Open and Run the Android Application

### Option A: Using Android Studio (Recommended)
1. Launch **Android Studio**.
2. Select **File > Open...** and navigate to `c:\DNA Detection APP\android`.
3. Allow Gradle to sync dependencies automatically.
4. Select an Android Emulator (or connected physical device with USB debugging enabled).
5. Click **Run** (`Shift + F10`).

### Option B: Command Line (Windows PowerShell / CMD)
Double-click `build_and_run.bat` or run:
```cmd
cd android
build_and_run.bat
```

### Option C: Connecting to the Local FastAPI Backend
- If using the **Android Emulator**, the app automatically connects to `http://10.0.2.2:8000/`, which maps to `localhost:8000` on your host PC.
- If using a **Physical Android Device**:
  1. Open the **Account / Settings** tab in the app.
  2. In the "FastAPI Server Base URL" field, enter your computer's local Wi-Fi IP (e.g. `http://192.168.1.50:8000/`).
  3. Tap **Apply & Probe**. Once confirmed, the status pill updates to **`API Connected`**.
- If the backend server is not running, the app automatically operates in **`Local Engine Mode`**, running all algorithms natively in Kotlin without any network dependencies.

---

## 5. Generating a Signed APK / App Bundle (Release)

To build a release APK or AAB:
1. Open the project in Android Studio.
2. Select **Build > Generate Signed Bundle / APK...**
3. Choose **Android App Bundle** (for Google Play) or **APK** (for direct installation).
4. Select your keystore (or create a new one).
5. Choose destination folder and click **Create**.
6. The compiled APK will be located at:
   `android/app/build/outputs/apk/release/app-release.apk`

