
@echo off
echo ========================================
echo   LINEN iOS BUILD AND SUBMIT TO TESTFLIGHT
echo ========================================
echo.
echo This script will:
echo 1. Clear EAS cache
echo 2. Build your iOS app for production
echo 3. Submit it to TestFlight
echo.
echo Current version: 1.0.1
echo Current build number: 3
echo.
pause

cd C:\Users\jtav8\Downloads\natively-app-update

echo.
echo [Step 1/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [Step 2/5] Logging into EAS...
call npx eas login
if errorlevel 1 (
    echo ERROR: EAS login failed
    pause
    exit /b 1
)

echo.
echo [Step 3/5] Clearing EAS cache...
call npx eas build:cancel --all
echo Cache cleared.

echo.
echo [Step 4/5] Building iOS app...
echo This will take 10-20 minutes...
call npx eas build --platform ios --profile production --clear-cache
if errorlevel 1 (
    echo ERROR: iOS build failed
    pause
    exit /b 1
)

echo.
echo [Step 5/5] Submitting to TestFlight...
call npx eas submit --platform ios --profile production
if errorlevel 1 (
    echo ERROR: TestFlight submission failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   SUCCESS! Your iOS app is on its way to TestFlight
echo ========================================
echo.
echo Next steps:
echo 1. Check your email for TestFlight notifications
echo 2. The app will appear in App Store Connect within 5-10 minutes
echo 3. TestFlight processing takes 10-30 minutes
echo.
pause
