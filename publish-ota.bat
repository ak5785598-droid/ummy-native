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

echo [1/4] Reading runtimeVersion from app.json...
cd /d D:\Ummy_Dev_Live\ummy-native
for /f %%a in ('node -e "console.log(require('./app.json').expo.runtimeVersion)"') do set RUNTIME_VERSION=%%a
echo  runtimeVersion: %RUNTIME_VERSION%
echo.

echo [2/4] Exporting bundle...
if exist %EXPORT_DIR% rmdir /s /q %EXPORT_DIR%
npx expo export --platform %PLATFORM% --output-dir %EXPORT_DIR%
if errorlevel 1 (
    echo Export failed!
    exit /b 1
)
echo Export complete!
echo.

echo [3/4] Publishing to Cloudflare Worker...
node D:\Ummy_Dev_Live\cloudflare-expo-updates-server\scripts\publish-update.js ^
  --server "%SERVER_URL%" ^
  --slug "%SLUG%" ^
  --platform "%PLATFORM%" ^
  --runtime-version "%RUNTIME_VERSION%" ^
  --export-dir "%EXPORT_DIR%" ^
  --auth-token "%AUTH_TOKEN%"
if errorlevel 1 (
    echo Publish failed!
    exit /b 1
)
echo.

echo [4/4] Cleanup...
rmdir /s /q %EXPORT_DIR% 2>nul

echo.
echo ========================================
echo  OTA Update Published Successfully!
echo ========================================
echo.
echo  Runtime Version: %RUNTIME_VERSION%
echo  Platform: %PLATFORM%
echo  Slug: %SLUG%
echo.
echo Next steps:
echo   1. Close the app on phone completely
echo   2. Reopen the app  
echo   3. Close again and reopen - new bundle loads!
echo.
pause
