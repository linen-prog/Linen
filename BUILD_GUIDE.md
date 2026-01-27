
# Linen App - Build & Deployment Guide

## Prerequisites

1. **Install EAS CLI globally:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure your project:**
   ```bash
   eas build:configure
   ```

## Building App Binaries

### iOS Builds

**Development Build (for testing on simulator):**
```bash
npm run build:ios:simulator
```

**Preview Build (for TestFlight internal testing):**
```bash
npm run build:ios:preview
```

**Production Build (for App Store):**
```bash
npm run build:ios:production
```

### Android Builds

**Preview Build (APK for testing):**
```bash
npm run build:android:preview
```

**Production Build (AAB for Play Store):**
```bash
npm run build:android:production
```

**Production APK (for direct distribution):**
```bash
npm run build:android:apk
```

### Build Both Platforms

```bash
npm run build:all:production
```

## Before Building - Checklist

### 1. Update app.json

- [ ] Set correct `version` (e.g., "1.0.0")
- [ ] Set `ios.buildNumber` (increment for each build)
- [ ] Set `android.versionCode` (increment for each build)
- [ ] Update `owner` to your Expo username
- [ ] Update `extra.eas.projectId` (get from `eas build:configure`)

### 2. App Icons

Your app currently uses `./assets/images/natively-dark.png` as the icon.

**Requirements:**
- **iOS:** 1024x1024px PNG (no transparency, no rounded corners)
- **Android Adaptive Icon:** 1024x1024px PNG (foreground layer)
- **Splash Screen:** 1284x2778px PNG (or use same as icon with `resizeMode: "contain"`)

**Recommended:** Create a proper app icon:
1. Design a 1024x1024px icon
2. Save as `./assets/images/app-icon.png`
3. Update `app.json`:
   ```json
   "icon": "./assets/images/app-icon.png"
   ```

### 3. iOS Specific Setup

**For App Store submission, you need:**

1. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com

2. **Update eas.json submit section:**
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-apple-id@example.com",
         "ascAppId": "1234567890",
         "appleTeamId": "ABCD123456"
       }
     }
   }
   ```

3. **App Store Connect Setup:**
   - Create app in App Store Connect
   - Set up app metadata, screenshots, description
   - Configure pricing and availability

### 4. Android Specific Setup

**For Play Store submission, you need:**

1. **Google Play Developer Account** ($25 one-time fee)
   - Sign up at https://play.google.com/console

2. **Create Service Account Key:**
   ```bash
   # Follow guide: https://docs.expo.dev/submit/android/
   # Download JSON key file
   ```

3. **Update eas.json submit section:**
   ```json
   "submit": {
     "production": {
       "android": {
         "serviceAccountKeyPath": "./google-service-account.json",
         "track": "internal"
       }
     }
   }
   ```

4. **Play Console Setup:**
   - Create app in Play Console
   - Set up store listing, screenshots, description
   - Configure content rating
   - Set up pricing and distribution

## Building Process

### Step 1: Build the Binary

```bash
# For iOS
npm run build:ios:production

# For Android
npm run build:android:production
```

This will:
1. Upload your code to EAS servers
2. Build the app in the cloud
3. Provide a download link when complete (usually 10-20 minutes)

### Step 2: Download the Binary

After the build completes, you'll get a URL to download:
- **iOS:** `.ipa` file
- **Android:** `.aab` file (for Play Store) or `.apk` file (for direct install)

### Step 3: Submit to App Stores

**iOS (to App Store):**
```bash
npm run submit:ios
```

**Android (to Play Store):**
```bash
npm run submit:android
```

Or manually upload:
- **iOS:** Upload `.ipa` to App Store Connect via Transporter app
- **Android:** Upload `.aab` to Play Console

## App Store Requirements

### iOS App Store

**Required Assets:**
- App icon (1024x1024px)
- Screenshots for all device sizes:
  - iPhone 6.7" (1290x2796px) - 3 required
  - iPhone 6.5" (1242x2688px)
  - iPhone 5.5" (1242x2208px)
  - iPad Pro 12.9" (2048x2732px)

**Required Information:**
- App name
- Subtitle (30 characters)
- Description (4000 characters max)
- Keywords (100 characters)
- Support URL
- Privacy Policy URL
- Category (Lifestyle or Health & Fitness)
- Age rating

### Android Play Store

**Required Assets:**
- App icon (512x512px)
- Feature graphic (1024x500px)
- Screenshots (at least 2):
  - Phone: 320-3840px on short side
  - Tablet: 1200-7680px on short side

**Required Information:**
- App name
- Short description (80 characters)
- Full description (4000 characters)
- Category (Lifestyle or Health & Fitness)
- Content rating questionnaire
- Privacy Policy URL

## Privacy Policy

You MUST have a privacy policy URL for both app stores.

**Create a privacy policy that covers:**
- What data you collect (email, reflections, check-ins)
- How you use the data (spiritual reflection, community sharing)
- Data storage and security
- User rights (access, deletion)
- Third-party services (OpenAI for AI features)

**Host it at:**
- Your website (e.g., https://linen.app/privacy)
- GitHub Pages
- Privacy policy generator services

**Update app.json:**
```json
"privacy": "public",
"privacyPolicyUrl": "https://your-website.com/privacy"
```

## Testing Before Submission

### iOS Testing

1. **TestFlight (Internal Testing):**
   ```bash
   npm run build:ios:preview
   ```
   - Add testers in App Store Connect
   - They can install via TestFlight app

2. **TestFlight (External Testing):**
   - Submit for Beta App Review
   - Share public link with testers

### Android Testing

1. **Internal Testing:**
   ```bash
   npm run build:android:preview
   ```
   - Upload to Play Console
   - Add testers via email
   - Share testing link

2. **Closed/Open Testing:**
   - Create testing track in Play Console
   - Add testers or make public

## Common Issues

### Build Fails

1. **Check build logs:**
   ```bash
   eas build:list
   ```

2. **Common fixes:**
   - Update dependencies: `npm update`
   - Clear cache: `npm run build:ios:production --clear-cache`
   - Check for TypeScript errors: `npm run lint`

### Submission Rejected

**iOS:**
- Missing privacy policy
- Missing app icon
- Crashes on launch
- Violates App Store guidelines

**Android:**
- Missing content rating
- Missing privacy policy
- Violates Play Store policies

## Build Monitoring

**Check build status:**
```bash
eas build:list
```

**View build details:**
```bash
eas build:view [build-id]
```

**Cancel a build:**
```bash
eas build:cancel [build-id]
```

## Version Management

**Before each new build:**

1. Update version in `app.json`:
   ```json
   "version": "1.0.1"
   ```

2. Increment build numbers:
   ```json
   "ios": {
     "buildNumber": "2"
   },
   "android": {
     "versionCode": 2
   }
   ```

## Cost Considerations

- **EAS Build:** Free tier includes limited builds/month, paid plans for more
- **Apple Developer:** $99/year
- **Google Play Developer:** $25 one-time
- **Hosting:** For privacy policy and support pages

## Next Steps

1. ✅ Configure EAS project: `eas build:configure`
2. ✅ Create proper app icon (1024x1024px)
3. ✅ Write privacy policy and host it
4. ✅ Set up Apple Developer account (iOS)
5. ✅ Set up Google Play Developer account (Android)
6. ✅ Build preview versions for testing
7. ✅ Test thoroughly on real devices
8. ✅ Create app store listings with screenshots
9. ✅ Build production versions
10. ✅ Submit to app stores

## Support

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **EAS Submit Docs:** https://docs.expo.dev/submit/introduction/
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Play Store Policies:** https://play.google.com/about/developer-content-policy/

---

**Ready to build?** Start with:
```bash
eas build:configure
npm run build:ios:preview
npm run build:android:preview
```
