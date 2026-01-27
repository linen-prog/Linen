
# 🌿 Linen App - Complete Build & Deployment Guide

This guide will walk you through building and deploying your Linen app to the iOS App Store and Google Play Store.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration Verification](#configuration-verification)
3. [Building Your App](#building-your-app)
4. [Testing Builds](#testing-builds)
5. [App Store Preparation](#app-store-preparation)
6. [Submitting to App Stores](#submitting-to-app-stores)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

Enter your Expo account credentials. If you don't have an account, create one at https://expo.dev

### 3. Configure EAS for Your Project

```bash
eas build:configure
```

This will:
- Create or update your `eas.json` file
- Link your project to your Expo account
- Generate a project ID

### 4. Developer Accounts (Required for App Store Submission)

**iOS App Store:**
- Apple Developer Account: $99/year
- Sign up at: https://developer.apple.com

**Google Play Store:**
- Google Play Developer Account: $25 one-time fee
- Sign up at: https://play.google.com/console

---

## ✅ Configuration Verification

### Your Current Configuration Status

#### app.json ✅
- ✅ App name: "Linen"
- ✅ Version: "1.0.0"
- ✅ iOS Bundle ID: `com.linen.app`
- ✅ Android Package: `com.linen.app`
- ✅ iOS Build Number: 1
- ✅ Android Version Code: 1
- ✅ Icon configured
- ✅ Splash screen configured
- ✅ Backend URL configured

#### eas.json ✅
- ✅ Development profile (for testing)
- ✅ Preview profile (internal testing)
- ✅ Production profile (app stores)
- ✅ Production-APK profile (direct Android install)

### What You Still Need

1. **Privacy Policy URL** (Required by both app stores)
   - You mentioned you're hosting it at `ts4lxkyubgrt4.mocha.app/privacy`
   - Make sure all placeholder information is filled in
   - Add to app.json once finalized (see below)

2. **App Store Connect Setup** (for iOS)
   - Create app in App Store Connect
   - Get your ASC App ID
   - Get your Apple Team ID

3. **Google Play Console Setup** (for Android)
   - Create app in Play Console
   - Create service account key for automated submission

---

## 🏗️ Building Your App

### Quick Start Commands

All build commands are already configured in your `package.json`:

```bash
# iOS Builds
npm run build:ios:simulator      # For iOS Simulator testing
npm run build:ios:preview        # For TestFlight internal testing
npm run build:ios:production     # For App Store submission

# Android Builds
npm run build:android:preview    # APK for testing
npm run build:android:production # AAB for Play Store
npm run build:android:apk        # APK for direct distribution

# Build Both Platforms
npm run build:all:production     # Build iOS and Android together
```

### Step-by-Step: Your First Build

#### 1. Start with Preview Builds (Recommended)

**iOS Preview Build:**
```bash
npm run build:ios:preview
```

**Android Preview Build:**
```bash
npm run build:android:preview
```

These builds are perfect for testing before submitting to app stores.

#### 2. Monitor Build Progress

After running a build command:
- You'll see a URL to monitor the build progress
- Builds typically take 10-20 minutes
- You'll receive an email when the build completes

**Check build status:**
```bash
eas build:list
```

**View specific build:**
```bash
eas build:view [build-id]
```

#### 3. Download Your Build

Once complete, you'll get a download link for:
- **iOS:** `.ipa` file (for TestFlight or App Store)
- **Android:** `.apk` file (for testing) or `.aab` file (for Play Store)

---

## 🧪 Testing Builds

### iOS Testing with TestFlight

1. **Build a preview version:**
   ```bash
   npm run build:ios:preview
   ```

2. **Upload to TestFlight:**
   - Download the `.ipa` file
   - Open App Store Connect
   - Go to your app → TestFlight
   - Upload the build using Transporter app (Mac) or web upload

3. **Add testers:**
   - Internal testers: Add up to 100 testers (no review required)
   - External testers: Requires Beta App Review

4. **Testers install via TestFlight app:**
   - They'll receive an email invitation
   - Install TestFlight from App Store
   - Accept invitation and install Linen

### Android Testing

1. **Build a preview APK:**
   ```bash
   npm run build:android:preview
   ```

2. **Install on device:**
   - Download the `.apk` file
   - Transfer to Android device
   - Enable "Install from Unknown Sources"
   - Install the APK

3. **Or use Play Console Internal Testing:**
   - Upload APK/AAB to Play Console
   - Create internal testing track
   - Add testers by email
   - Share testing link

---

## 🎨 App Store Preparation

### Required Assets

#### App Icon
- **Current:** `./assets/images/c7d8c00a-d42f-4f75-9ef2-bb675b6498d8.png`
- **Requirements:**
  - 1024x1024px PNG
  - No transparency
  - No rounded corners (iOS adds them automatically)
  - Should represent your Linen brand

**Tip:** Create a clean, simple icon that represents spiritual reflection and peace.

#### Screenshots

**iOS (Required for App Store):**
- iPhone 6.7" (1290x2796px) - At least 3 screenshots
- iPhone 6.5" (1242x2688px) - Optional but recommended
- iPad Pro 12.9" (2048x2732px) - If supporting iPad

**Android (Required for Play Store):**
- Phone: 320-3840px on short side (at least 2)
- Tablet: 1200-7680px on short side (optional)
- Feature Graphic: 1024x500px (required)

**Screenshot Tips:**
- Show key features: Check-In, Daily Gift, Community
- Use actual app screens
- Add text overlays to explain features
- Show the calm, peaceful UI

#### App Store Listing Content

**App Name:** Linen

**Subtitle (iOS, 30 chars):** Gentle space for reflection

**Short Description (Android, 80 chars):**
"A gentle space for reflection, prayer, and embodied awareness"

**Full Description (4000 chars max):**
```
Linen is a gentle space for spiritual reflection, prayer, and embodied awareness.

WHAT LINEN IS:
• A space for prayerful reflection and spiritual companionship
• A place to tend to your inner life with care
• A community for gentle, faith-rooted sharing

WHAT LINEN IS NOT:
• Not medical advice or mental health treatment
• Not therapy or clinical intervention
• Not a productivity or self-improvement tool

FEATURES:
• Check-In: Gentle AI-guided reflection and prayer
• Daily Gift: Scripture-rooted daily reflections
• Community: Share reflections and lift others in prayer
• Somatic Practices: Embodied awareness exercises
• Weekly Recap: Reflect on your spiritual journey

WHO LINEN IS FOR:
Linen is for anyone seeking a gentle, non-directive space for spiritual reflection, prayer, and presence. Whether you're tending to spiritual wounds, seeking deeper connection, or simply wanting a calm space for reflection, Linen welcomes you.

CARE & SAFETY:
Linen is not a substitute for professional mental health care. If you're in crisis, please reach out to:
• 988 Suicide & Crisis Lifeline (US)
• Your local emergency services
• A trusted healthcare provider

Peace to you.
```

**Keywords (iOS, 100 chars):**
```
prayer, reflection, spiritual, faith, meditation, mindfulness, peace, calm, community, devotional
```

**Category:**
- iOS: Lifestyle or Health & Fitness
- Android: Lifestyle or Health & Fitness

**Age Rating:**
- 4+ (iOS) / Everyone (Android)

#### Privacy Policy

**CRITICAL:** Both app stores require a privacy policy URL.

**Your Privacy Policy Checklist:**
- ✅ Hosted at accessible URL (you mentioned `ts4lxkyubgrt4.mocha.app/privacy`)
- ✅ All placeholder information filled in (dates, contact email, etc.)
- ✅ Covers data collection (email, reflections, check-ins)
- ✅ Explains data usage (spiritual reflection, AI processing)
- ✅ Mentions third-party services (OpenAI for AI features)
- ✅ Explains user rights (access, deletion)
- ✅ Includes contact information

**Add to app.json once finalized:**
```json
{
  "expo": {
    "privacy": "public",
    "privacyPolicyUrl": "https://ts4lxkyubgrt4.mocha.app/privacy"
  }
}
```

---

## 🚀 Submitting to App Stores

### iOS App Store Submission

#### 1. Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: Linen
   - Primary Language: English
   - Bundle ID: com.linen.app
   - SKU: com.linen.app (or any unique identifier)

#### 2. Build Production Version

```bash
npm run build:ios:production
```

#### 3. Upload to App Store Connect

**Option A: Automatic Submission (Recommended)**

First, update `eas.json` with your Apple information:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      }
    }
  }
}
```

Then submit:
```bash
npm run submit:ios
```

**Option B: Manual Upload**

1. Download the `.ipa` file from EAS
2. Open Transporter app (Mac)
3. Drag and drop the `.ipa` file
4. Click "Deliver"

#### 4. Complete App Store Listing

In App Store Connect:
1. Add app icon (1024x1024px)
2. Add screenshots for all required device sizes
3. Fill in app description, keywords, subtitle
4. Add privacy policy URL
5. Set pricing (Free)
6. Choose availability (All countries or specific)
7. Add support URL (your website or email)
8. Complete age rating questionnaire

#### 5. Submit for Review

1. Select the build you uploaded
2. Add "What's New in This Version" text
3. Click "Submit for Review"
4. Review typically takes 24-48 hours

### Android Play Store Submission

#### 1. Create App in Play Console

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - App name: Linen
   - Default language: English
   - App or game: App
   - Free or paid: Free
4. Accept declarations

#### 2. Set Up Service Account (for automated submission)

Follow this guide: https://docs.expo.dev/submit/android/

1. Create service account in Google Cloud Console
2. Download JSON key file
3. Save as `google-service-account.json` in project root
4. Add to `.gitignore` (keep it secret!)

Update `eas.json`:
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

#### 3. Build Production Version

```bash
npm run build:android:production
```

This creates an `.aab` (Android App Bundle) file optimized for Play Store.

#### 4. Submit to Play Store

**Option A: Automatic Submission**
```bash
npm run submit:android
```

**Option B: Manual Upload**
1. Download the `.aab` file
2. Go to Play Console → Your app → Release → Production
3. Click "Create new release"
4. Upload the `.aab` file

#### 5. Complete Store Listing

In Play Console:

**Main store listing:**
1. App name: Linen
2. Short description (80 chars)
3. Full description (4000 chars)
4. App icon (512x512px)
5. Feature graphic (1024x500px)
6. Screenshots (at least 2)
7. Category: Lifestyle
8. Contact email
9. Privacy policy URL

**Content rating:**
1. Complete questionnaire
2. Linen should receive "Everyone" rating

**App content:**
1. Privacy policy URL
2. Ads: No (if you don't have ads)
3. In-app purchases: No (unless using Superwall)
4. Target audience: All ages

**Pricing & distribution:**
1. Free
2. Select countries (or all)
3. Content guidelines compliance

#### 6. Submit for Review

1. Review all sections (must be complete)
2. Click "Send for review"
3. Review typically takes 1-7 days (first submission may take longer)

---

## 🔄 Version Updates

### When to Increment Versions

**Increment version number** (`1.0.0` → `1.0.1`) for:
- Bug fixes
- Minor feature additions
- Content updates

**Increment major version** (`1.0.0` → `2.0.0`) for:
- Major new features
- Significant UI changes
- Breaking changes

### How to Update Versions

1. **Update app.json:**
```json
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "2"
    },
    "android": {
      "versionCode": 2
    }
  }
}
```

2. **Build new version:**
```bash
npm run build:all:production
```

3. **Submit update:**
```bash
npm run submit:ios
npm run submit:android
```

**Important:**
- iOS `buildNumber` must increment for each build (even if version stays same)
- Android `versionCode` must increment for each build
- Version string (`1.0.1`) is what users see
- Build numbers are internal tracking

---

## 🐛 Troubleshooting

### Build Fails

**Check build logs:**
```bash
eas build:list
eas build:view [build-id]
```

**Common issues:**

1. **TypeScript errors:**
   ```bash
   npm run lint
   ```
   Fix any errors before building.

2. **Dependency issues:**
   ```bash
   npm install
   npm update
   ```

3. **Cache issues:**
   ```bash
   npm run build:ios:production -- --clear-cache
   ```

4. **iOS provisioning issues:**
   - Make sure you have an Apple Developer account
   - EAS will automatically handle certificates and provisioning profiles

5. **Android signing issues:**
   - EAS automatically handles Android signing
   - If you have existing keystore, you can upload it to EAS

### Submission Rejected

**iOS Common Rejections:**

1. **Missing privacy policy:**
   - Add privacy policy URL to app.json and App Store Connect

2. **App crashes:**
   - Test thoroughly with TestFlight before submitting
   - Check crash logs in App Store Connect

3. **Guideline violations:**
   - Review App Store Review Guidelines
   - Make sure app description matches functionality

4. **Missing features:**
   - If you mention features in description, they must work
   - Remove any "coming soon" features from description

**Android Common Rejections:**

1. **Missing content rating:**
   - Complete content rating questionnaire in Play Console

2. **Privacy policy issues:**
   - Must be accessible and complete
   - Must match data collection practices

3. **Misleading content:**
   - App must do what description says
   - No false health claims

### App Crashes on Launch

1. **Check backend URL:**
   - Make sure `extra.backendUrl` in app.json is correct
   - Test backend is accessible

2. **Check for console errors:**
   - Use `npm run dev` to test locally
   - Check for JavaScript errors

3. **Test on real devices:**
   - Simulators may not catch all issues
   - Test on both iOS and Android physical devices

---

## 📊 Build Monitoring

### Check Build Status

```bash
# List all builds
eas build:list

# View specific build
eas build:view [build-id]

# Cancel a build
eas build:cancel [build-id]
```

### Build Notifications

You'll receive email notifications for:
- Build started
- Build completed successfully
- Build failed

---

## 💰 Cost Summary

- **EAS Build:** Free tier includes limited builds/month
  - Paid plans available for unlimited builds
  - Check current pricing: https://expo.dev/pricing

- **Apple Developer:** $99/year (required for App Store)

- **Google Play Developer:** $25 one-time (required for Play Store)

- **Hosting:** Free (using Specular for backend)

---

## 📝 Pre-Submission Checklist

### Before Building Production Version

- [ ] All features tested and working
- [ ] No console errors or warnings
- [ ] App icon finalized (1024x1024px)
- [ ] Splash screen looks good
- [ ] Privacy policy complete and hosted
- [ ] Privacy policy URL added to app.json
- [ ] Version number set correctly
- [ ] Build numbers set (iOS: 1, Android: 1)

### Before Submitting to App Stores

**iOS:**
- [ ] Apple Developer account active
- [ ] App created in App Store Connect
- [ ] Screenshots prepared (all required sizes)
- [ ] App description written
- [ ] Keywords chosen
- [ ] Support URL ready
- [ ] Privacy policy URL added
- [ ] Age rating completed
- [ ] Pricing set (Free)
- [ ] Build uploaded and processed

**Android:**
- [ ] Google Play Developer account active
- [ ] App created in Play Console
- [ ] Screenshots prepared (at least 2)
- [ ] Feature graphic created (1024x500px)
- [ ] App description written
- [ ] Content rating completed
- [ ] Privacy policy URL added
- [ ] Store listing complete
- [ ] Build uploaded

---

## 🎯 Quick Start Guide

### First Time Setup (One-time)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
eas login

# 3. Configure project
eas build:configure
```

### Build and Test (Before App Store Submission)

```bash
# 4. Build preview versions
npm run build:ios:preview
npm run build:android:preview

# 5. Test with TestFlight (iOS) and internal testing (Android)
# Download builds and distribute to testers

# 6. Gather feedback and fix issues
```

### Production Submission

```bash
# 7. Build production versions
npm run build:all:production

# 8. Submit to app stores
npm run submit:ios
npm run submit:android

# 9. Complete store listings in App Store Connect and Play Console

# 10. Submit for review
```

---

## 🆘 Getting Help

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **EAS Submit Docs:** https://docs.expo.dev/submit/introduction/
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Play Store Policies:** https://play.google.com/about/developer-content-policy/
- **Expo Forums:** https://forums.expo.dev/
- **Expo Discord:** https://chat.expo.dev/

---

## ✅ Next Steps

1. **Test your current build:**
   ```bash
   npm run build:ios:preview
   npm run build:android:preview
   ```

2. **Finalize privacy policy:**
   - Fill in all placeholder information
   - Make sure it's accessible at your URL
   - Add URL to app.json

3. **Prepare app store assets:**
   - Create/finalize app icon
   - Take screenshots of key features
   - Write app description

4. **Set up developer accounts:**
   - Apple Developer (if targeting iOS)
   - Google Play Developer (if targeting Android)

5. **Build production and submit:**
   - Once everything is ready
   - Follow the submission steps above

---

**You're ready to build! Start with:**

```bash
npm run build:ios:preview
npm run build:android:preview
```

Good luck with your Linen app launch! 🌿✨
