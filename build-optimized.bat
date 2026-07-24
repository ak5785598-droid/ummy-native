@echo off
echo ============================================
echo   Ummy Chat - Optimized Release Build
echo ============================================
echo.

:: Set Java 17
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

echo [1/4] Java version check:
java -version 2>&1
echo.

:: Kill old Gradle daemons
echo [2/4] Cleaning old daemons...
taskkill /F /IM java.exe 2>nul
timeout /t 2 /nobreak >nul

:: Navigate to android folder
cd /d D:\Ummy_Dev_Live\ummy-native\android

:: Clean + Build
echo [3/4] Starting clean release build (arm64 only + R8 minify)...
echo This may take 5-10 minutes...
echo.
call gradlew.bat clean assembleRelease --no-daemon

echo.
echo [4/4] Build complete!
echo APK location: android\app\build\outputs\apk\release\
echo.
dir /b *.apk
echo.
pause
