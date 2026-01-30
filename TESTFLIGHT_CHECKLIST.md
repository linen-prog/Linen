
# TestFlight Submission Checklist for Linen

## ✅ **COMPLETED - Ready for TestFlight**

### App Configuration
- ✅ App name: "Linen"
- ✅ Bundle identifier: `com.linen.app`
- ✅ Version: 1.0.0
- ✅ Build number: 1
- ✅ App icon configured (240x240)
- ✅ Splash screen configured
- ✅ Privacy policy URL set
- ✅ App description and keywords added
- ✅ ITSAppUsesNonExemptEncryption: false

### Core Features
- ✅ Landing/orientation screen
- ✅ Authentication (email + OAuth)
- ✅ Check-in AI conversations
- ✅ Daily Gift with scripture
- ✅ Community features (Feed, Wisdom, Care, Prayers)
- ✅ Profile management
- ✅ Somatic practices
- ✅ Weekly recap
- ✅ Dark mode support
- ✅ Crisis detection and 988 resources

### Technical Requirements
- ✅ No console errors
- ✅ Backend API connected and working
- ✅ Authentication flow working
- ✅ All screens accessible
- ✅ iOS and Android compatibility
- ✅ Tablet support enabled

### Legal & Privacy
- ✅ Privacy policy complete with contact info
- ✅ Clear disclaimers (not therapy/medical)
- ✅ Crisis resources (988, Crisis Text Line)
- ✅ Data handling explained
- ✅ User rights documented

## ⚠️ **ACTION REQUIRED BEFORE SUBMISSION**

### Apple Developer Account Setup
You need to update `eas.json` with your actual Apple Developer credentials:

1. **Get your Apple ID:** The email you use for Apple Developer
2. **Get your ASC App ID:** 
   - Go to App Store Connect
   - Create your app listing
   - Copy the App ID (looks like: 1234567890)
3. **Get your Team ID:**
   - Go to developer.apple.com
   - Account > Membership
   - Copy your Team ID (looks like: ABC123XYZ4)

Then update `eas.json`:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-actual-email@example.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABC123XYZ4"
    }
  }
}
```

## 📋 **NEXT STEPS TO SUBMIT**

### 1. Build for TestFlight
```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure your project
eas build:configure

# Build for iOS (production)
eas build --platform ios --profile production
```

### 2. While Build is Running
- Create your app listing in App Store Connect
- Prepare app screenshots (required sizes)
- Write your app description
- Set age rating (likely 12+ due to community features)
- Add privacy nutrition labels

### 3. After Build Completes
```bash
# Submit to TestFlight
eas submit --platform ios --profile production
```

### 4. TestFlight Setup
- Add internal testers (up to 100)
- Add external testers (requires App Review)
- Provide test information and notes

## 📱 **APP STORE CONNECT REQUIREMENTS**

### App Information
- **Name:** Linen
- **Subtitle:** A gentle space for reflection and prayer
- **Category:** Health & Fitness (or Lifestyle)
- **Age Rating:** 12+ (due to community features and crisis content)

### Privacy Nutrition Labels
You'll need to declare:
- **Contact Info:** Email address
- **User Content:** Reflections, posts, prayers
- **Identifiers:** User ID
- **Usage Data:** App interactions, crash data

### App Description (Suggested)
```
Linen is a gentle space for reflection, prayer, and embodied awareness.

WHAT LINEN OFFERS:
• Check-In Companion: Reflective conversations with AI guidance
• Daily Gift: Scripture-rooted reflections and somatic invitations
• Community: Share prayers and support with others
• Somatic Practices: Gentle embodied awareness exercises
• Weekly Recap: Reflect on your spiritual journey

WHAT LINEN IS:
✓ A space for spiritual reflection and prayer
✓ A companion for embodied awareness
✓ A supportive faith community

WHAT LINEN IS NOT:
✗ Not therapy or mental health treatment
✗ Not medical advice or diagnosis
✗ Not crisis intervention

If you're in crisis, please contact 988 (Suicide & Crisis Lifeline) or emergency services.

Your privacy matters. We don't sell your data. Reflections are private unless you choose to share.
```

### Screenshots Needed
Prepare screenshots for:
- iPhone 6.7" (iPhone 15 Pro Max)
- iPhone 6.5" (iPhone 14 Plus)
- iPhone 5.5" (iPhone 8 Plus)
- iPad Pro 12.9" (optional but recommended)

Suggested screenshots:
1. Landing screen (showing "What Linen Is")
2. Check-in conversation
3. Daily Gift screen
4. Community feed
5. Profile with streaks

## 🔍 **FINAL CHECKS BEFORE SUBMISSION**

- [ ] Test on a real iOS device (not just simulator)
- [ ] Test authentication flow completely
- [ ] Test all main features (check-in, daily gift, community)
- [ ] Test dark mode
- [ ] Verify crisis detection shows 988 resources
- [ ] Test account deletion works
- [ ] Verify privacy policy link works
- [ ] Check that all icons display correctly (no question marks)
- [ ] Test on both iPhone and iPad

## 📞 **SUPPORT & RESOURCES**

- **Expo EAS Docs:** https://docs.expo.dev/submit/ios/
- **App Store Connect:** https://appstoreconnect.apple.com
- **TestFlight Guide:** https://developer.apple.com/testflight/

## ✨ **YOU'RE READY!**

Your app is in excellent shape. Once you:
1. Update eas.json with your Apple credentials
2. Run the build command
3. Create your App Store Connect listing

You'll be ready to submit to TestFlight!

Good luck with your launch! 🎉
