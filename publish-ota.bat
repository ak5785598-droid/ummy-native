@echo off
setlocal

set SERVER_URL=https://ummy-ota.ak5785598.workers.dev
set AUTH_TOKEN=ummy-ota-secret-b5783d886dc44fa8
set SLUG=ummy-native
set PLATFORM=android
set EXPORT_DIR=dist-ota

echo ========================================
echo  Ummy OTA Update Publisher
echo ========================================
echo.

echo [1/3] Exporting bundle...
cd /d D:\Ummy_Dev_Live\ummy-native
if exist %EXPORT_DIR% rmdir /s /q %EXPORT_DIR%
npx expo export --platform %PLATFORM% --output-dir %EXPORT_DIR%
if errorlevel 1 (
    echo Export failed!
    exit /b 1
)
echo Export complete!
echo.

echo [2/3] Publishing to Cloudflare Worker...
node D:\Ummy_Dev_Live\cloudflare-expo-updates-server\scripts\publish-update.js ^
  --server "%SERVER_URL%" ^
  --slug "%SLUG%" ^
  --platform "%PLATFORM%" ^
  --runtime-version "1.0.0" ^
  --export-dir "%EXPORT_DIR%" ^
  --auth-token "%AUTH_TOKEN%"
if errorlevel 1 (
    echo Publish failed!
    exit /b 1
)
echo.

echo [3/3] Cleanup...
rmdir /s /q %EXPORT_DIR% 2>nul

echo.
echo ========================================
echo  OTA Update Published Successfully!
echo ========================================
echo.
echo Next steps:
echo   1. Close the app on phone
echo   2. Reopen the app
echo   3. Close again and reopen - new bundle loads!
echo.
pause
