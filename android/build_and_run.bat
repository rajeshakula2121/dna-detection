@echo off
echo =====================================================================
echo  GenomicsAI Android Application — Native Build & Verification
echo =====================================================================
echo.

cd /d "%~dp0"

if not defined JAVA_HOME (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    ) else if exist "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot" (
        set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
    )
)

echo [1/3] Using Java Runtime: %JAVA_HOME%
"%JAVA_HOME%\bin\java.exe" -version
echo.

echo [2/3] Running Native Bioinformatics Engine Unit Tests...
call gradlew.bat testDebugUnitTest --info
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Test suite encountered an issue or Android SDK setup is required.
)

echo.
echo [3/3] Assembling Debug APK...
call gradlew.bat assembleDebug
if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] APK Built Successfully!
    echo Output: android\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo.
    echo [INFO] You can also open the 'android' folder directly in Android Studio
    echo to run the app on an Emulator or connected Physical Device.
)

echo.
pause

