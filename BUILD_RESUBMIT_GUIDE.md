
# 🚀 Linen App - Build & Resubmit Guide

## Current Status
- **App Name:** Linen
- **Version:** 1.0.1
- **Build Number:** 3 (iOS and Android)
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

### 4. Build for iOS (TestFlight)
```bash
npx eas build --platform ios --profile production
```

**What happens:**
- EAS will build your app in the cloud
- This takes about 10-20 minutes
- You'll get a link to track progress
- When complete, the build will be ready for submission

### 5. Submit to TestFlight
After the build completes successfully:

```bash
npx eas submit --platform ios --profile production
```

**What happens:**
- EAS will automatically submit your build to App Store Connect
- Apple will process it (usually 5-30 minutes)
- You'll receive an email when it's ready for testing
- The build will appear in TestFlight

### 6. Build for Android (Optional)
If you also want to update Android:

```bash
npx eas build --platform android --profile production
```

## 🔍 Troubleshooting

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

# Build iOS
npx eas build --platform ios --profile production

# Submit to TestFlight
npx eas submit --platform ios --profile production

# Check build status
npx eas build:list

# View project info
npx eas project:info
```

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
