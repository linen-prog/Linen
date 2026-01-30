
# ✅ Linen App Resubmission Checklist

## Before You Start
- [ ] You have the `natively-app-update` folder extracted
- [ ] You have your Expo account credentials ready
- [ ] You have your Apple ID credentials ready (linenprayer@gmail.com)
- [ ] You have internet connection

## Resubmission Steps

### Option 1: Use the Automated Script (Easiest)
1. [ ] Open File Explorer
2. [ ] Navigate to `C:\Users\jtav8\Downloads\natively-app-update`
3. [ ] Double-click `build-and-submit.bat`
4. [ ] Follow the prompts
5. [ ] Wait for completion (10-20 minutes)

### Option 2: Manual Commands
1. [ ] Open Command Prompt
2. [ ] Run: `cd C:\Users\jtav8\Downloads\natively-app-update`
3. [ ] Run: `npm install`
4. [ ] Run: `npx eas login`
5. [ ] Run: `npx eas build --platform ios --profile production`
6. [ ] Wait for build to complete (10-20 minutes)
7. [ ] Run: `npx eas submit --platform ios --profile production`
8. [ ] Wait for submission to complete

## After Submission
- [ ] Check email for Apple's processing confirmation
- [ ] Log in to App Store Connect
- [ ] Verify build appears in TestFlight
- [ ] Test the app on your device
- [ ] Invite beta testers (if needed)

## What's New in This Build
- Build number incremented to 3
- Version remains 1.0.1
- All your recent updates are included

## Common Issues

### "The system cannot find the path specified"
**Fix:** You're not in the right directory. Make sure you're in `natively-app-update`

### "build command failed"
**Fix:** Run `npm install` first, then try again

### "Not logged in"
**Fix:** Run `npx eas login` and enter your Expo credentials

### Build is taking forever
**This is normal!** Cloud builds take 10-20 minutes. Be patient.

## Need Help?
If you see any error messages:
1. Take a screenshot of the ENTIRE error
2. Copy the error text
3. Share it with me and I'll help you fix it immediately

---

**Current Build Info:**
- App: Linen
- Version: 1.0.1
- Build: 3
- Bundle ID: com.linen.app
