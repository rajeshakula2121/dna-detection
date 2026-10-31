@rem =========================================================================
@rem  GenomicsAI Android Application — Gradle Wrapper Script for Windows
@rem =========================================================================
@if "%DEBUG%"=="" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Resolve Java Home
if not "%JAVA_HOME%"=="" goto gotJavaHome
if exist "C:\Program Files\Android\Android Studio\jbr" set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
if exist "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot" set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot

:gotJavaHome
@rem Check if standard gradle.bat exists in user cache
set GRADLE_BIN=C:\Users\kukat\.gradle\wrapper\dists\gradle-9.2.0-bin\11i5gvueggl8a5cioxuftxrik\gradle-9.2.0\bin\gradle.bat
if exist "%GRADLE_BIN%" (
    call "%GRADLE_BIN%" %*
    goto end
)

@rem Check if gradle is on PATH
where gradle >nul 2>&1
if %ERRORLEVEL% equ 0 (
    call gradle %*
    goto end
)

echo.
echo [ERROR] Could not locate Gradle executable or Wrapper.
echo Please open the project in Android Studio (File - Open - select 'c:\DNA Detection APP\android')
echo or install Gradle 8.7+ on your system PATH.
echo.
exit /b 1

:end
if "%OS%"=="Windows_NT" endlocal

