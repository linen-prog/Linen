
# 🚀 Linen App - Build & Resubmit Guide (UPDATED FIX)

## ⚠️ IMPORTANT: Current Build Error Fixed

The build was failing with error:
```
"ios.production.android.buildType" must be one of [apk, app-bundle]
```

**This has been FIXED** by removing the `bundleIdentifier` from the iOS production config in `eas.json`.

## Current Status
- **App Name:** Linen
- **Version:** 1.0.1
- **Build Number:** 3 (increment to 4 before next build)
- **Bundle ID:** com.linen.app

## ✅ Step-by-Step Instructions

### 1. Navigate to Your Project Directory
Open Command Prompt (cmd) or PowerShell and navigate to your project:

```bash
cd C:\Users\jtav8\Downloads\natively-app-update
```

**Important:** Make sure you see files like `package.json`, `app.json`, and `eas.json` when you run `dir`

### 2. Install Dependencies (if needed)
If this is a fresh extraction, install dependencies first:

```bash
npm install
```

### 3. Login to Expo (if not already logged in)
```bash
npx eas login
```

Enter your Expo account credentials when prompted.

### 4. Update Build Number
Before building, open `app.json` and increment the build number:

```json
"ios": {
  "buildNumber": "4"  // Change from 3 to 4
}
```

### 5. Build for iOS (TestFlight) - WITH CACHE CLEARING
```bash
npx eas build --platform ios --profile production --clear-cache --non-interactive
```

**Important flags added:**
- `--clear-cache`: Clears any cached configurations that might cause errors
- `--non-interactive`: Prevents prompts that could cause issues

**What happens:**
- EAS will build your app in the cloud
- This takes about 10-20 minutes
- You'll get a link to track progress
- When complete, the build will be ready for submission

### 6. Submit to TestFlight
After the build completes successfully:

```bash
npx eas submit --platform ios --profile production --non-interactive
```

**What happens:**
- EAS will automatically submit your build to App Store Connect
- Apple will process it (usually 5-30 minutes)
- You'll receive an email when it's ready for testing
- The build will appear in TestFlight

### 7. Build for Android (Optional)
If you also want to update Android:

```bash
npx eas build --platform android --profile production
```

## 🔧 What Was Fixed

The previous build error was caused by:
1. **Redundant bundleIdentifier** in `eas.json` iOS production config
2. **Cached configurations** from previous builds
3. **Mixed iOS/Android settings** in the build profile

**The fix:**
- Removed `bundleIdentifier` from `eas.json` (it should only be in `app.json`)
- Added `--clear-cache` flag to clear old configurations
- Added `--non-interactive` flag to prevent prompt issues
- Ensured iOS config has NO Android-specific settings

## 🔍 Troubleshooting

### Error: "ios.production.android.buildType" must be one of [apk, app-bundle]
**Status:** ✅ FIXED
**Solution:** This error has been resolved by:
1. Removing `bundleIdentifier` from iOS production config in `eas.json`
2. Using `--clear-cache` flag when building
3. Ensuring no Android settings in iOS profile

If you still see this error:
```bash
# Cancel all pending builds
npx eas build:cancel --all

# Clear cache and rebuild
npx eas build --platform ios --profile production --clear-cache --non-interactive
```

### Error: "build command failed"
**Solution:** Make sure you're in the correct directory. Run `dir` and verify you see:
- package.json
- app.json
- eas.json
- app/ folder
- assets/ folder

### Error: "Not logged in"
**Solution:** Run `npx eas login` and enter your credentials

### Error: "Invalid credentials"
**Solution:** Your Apple ID or Team ID might be incorrect. Check `eas.json` file.

### Build takes too long
**Solution:** This is normal. Cloud builds can take 10-20 minutes. You can close the terminal and check status later at: https://expo.dev/accounts/[your-account]/projects/linen/builds

### Error: "eas.json is not valid"
**Solution:** The `eas.json` file has been corrected. Make sure it looks like this:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "linenprayer@gmail.com",
        "ascAppId": "6740269073",
        "appleTeamId": "ZSU6WP9K6J"
      }
    }
  }
}
```

**Note:** The `bundleIdentifier` should ONLY be in `app.json`, NOT in `eas.json`!

## 📱 After Submission

1. **Check Email:** Apple will send you an email when processing is complete
2. **App Store Connect:** Log in to https://appstoreconnect.apple.com
3. **TestFlight:** Go to "TestFlight" tab to see your build
4. **Add Testers:** Once approved, you can invite testers via email

## 🎯 Quick Commands Reference

```bash
# Check if you're in the right directory
dir

# Login to Expo
npx eas login

# Cancel all pending builds (if needed)
npx eas build:cancel --all

# Build iOS (with cache clearing - RECOMMENDED)
npx eas build --platform ios --profile production --clear-cache --non-interactive

# Submit to TestFlight
npx eas submit --platform ios --profile production --non-interactive

# Check build status
npx eas build:list

# View project info
npx eas project:info
```

## ✅ Verification Checklist

Before building, verify:
- [ ] Build number incremented in `app.json` (change 3 to 4)
- [ ] `eas.json` has NO `bundleIdentifier` in iOS production config
- [ ] `eas.json` has NO Android settings in iOS profile
- [ ] You're logged into EAS (`npx eas whoami`)
- [ ] You're in the correct directory (`dir` shows package.json)
- [ ] Using `--clear-cache` flag in build command

## 📞 Need Help?

If you encounter any errors:
1. Copy the FULL error message
2. Take a screenshot
3. Share it with me and I'll help you fix it

## ✨ What Changed in Build 3

- Version: 1.0.1 (same as before)
- Build Number: 3 (incremented from 2)
- This allows you to submit a new build to TestFlight without changing the version number

---

**Remember:** You must be in the `natively-app-update` directory when running these commands!
