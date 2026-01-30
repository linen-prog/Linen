
@echo off
echo ========================================
echo Linen App - Build and Submit to TestFlight
echo ========================================
echo.

echo Step 1: Checking if we're in the right directory...
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Please make sure you're running this from the natively-app-update folder
    pause
    exit /b 1
)
echo ✓ Found package.json

echo.
echo Step 2: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed

echo.
echo Step 3: Logging in to Expo...
call npx eas login
if errorlevel 1 (
    echo ERROR: Failed to login
    pause
    exit /b 1
)
echo ✓ Logged in

echo.
echo Step 4: Building for iOS...
echo This will take 10-20 minutes. Please wait...
call npx eas build --platform ios --profile production
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo ✓ Build completed

echo.
echo Step 5: Submitting to TestFlight...
call npx eas submit --platform ios --profile production
if errorlevel 1 (
    echo ERROR: Submission failed
    pause
    exit /b 1
)
echo ✓ Submitted to TestFlight

echo.
echo ========================================
echo SUCCESS! Your app has been submitted to TestFlight
echo Check your email for updates from Apple
echo ========================================
pause
