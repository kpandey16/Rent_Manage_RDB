# Android App Deployment Guide

This guide will help you deploy Rent Manage as an Android app on Google Play Store using Bubblewrap.

## Prerequisites

- ✅ Bubblewrap CLI installed
- ✅ Google Play Console account ($25 one-time fee)
- ⬜ Deployed PWA URL (https://your-domain.com)
- ⬜ Java Development Kit (JDK) - Bubblewrap will install this

## Phase 1: Deploy Your PWA

### Option A: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

After deployment, you'll get a URL like: `https://rent-manage.vercel.app`

### Option B: Deploy to Netlify

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## Phase 2: Create Android App with Bubblewrap

### Step 1: Create Android Project Directory

```bash
cd ~  # Go to home directory
mkdir rent-manage-android
cd rent-manage-android
```

### Step 2: Initialize Bubblewrap

```bash
bubblewrap init --manifest https://YOUR-DEPLOYED-URL.com/manifest.json
```

### Step 3: Answer the Prompts

| Prompt | Recommended Answer |
|--------|-------------------|
| Domain | your-deployed-url.com |
| Application name | Rent Manage |
| Short name | RentManage |
| Application ID | com.rentmanage.app |
| Display mode | standalone |
| Orientation | portrait |
| Theme color | #000000 |
| Background color | #ffffff |
| Icon URL | (auto-filled from manifest) |
| Maskable icon URL | (auto-filled from manifest) |
| Fallback type | customtabs |

### Step 4: Install JDK

```bash
bubblewrap jdk
```

### Step 5: Generate Signing Key

```bash
cd ~/rent-manage-android
keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias rent-manage
```

**IMPORTANT**:
- Remember your password!
- Save `release-key.jks` file securely
- You'll need this for ALL future app updates

### Step 6: Get SHA-256 Fingerprint

```bash
keytool -list -v -keystore release-key.jks -alias rent-manage
```

Look for output like:
```
SHA256: AB:CD:EF:12:34:56:78:90:...
```

Copy this fingerprint (remove colons).

### Step 7: Update assetlinks.json

Back in your Rent Manage project:

```bash
cd /home/user/Rent_Manage_RDB
./scripts/update-assetlinks.sh
```

Enter:
1. Your SHA-256 fingerprint (without colons)
2. Your package name (e.g., com.rentmanage.app)

### Step 8: Deploy Updated assetlinks.json

```bash
# Commit changes
git add public/.well-known/assetlinks.json public/manifest.json next.config.ts
git commit -m "Add Android Digital Asset Links configuration"
git push

# Redeploy to production
vercel --prod  # or netlify deploy --prod
```

### Step 9: Verify Digital Asset Links

Visit: `https://your-deployed-url.com/.well-known/assetlinks.json`

You should see your package name and fingerprint.

### Step 10: Build Android App

```bash
cd ~/rent-manage-android

# For testing (APK)
bubblewrap build

# For Play Store (AAB - recommended)
bubblewrap build --skipPwaValidation
```

Output files:
- APK: `app/build/outputs/apk/release/app-release-signed.apk`
- AAB: `app/build/outputs/bundle/release/app-release-bundle.aab`

### Step 11: Test on Android Device

```bash
# Connect Android device via USB (enable USB debugging)
bubblewrap install

# Or manually install the APK
adb install app/build/outputs/apk/release/app-release-signed.apk
```

## Phase 3: Google Play Store Submission

### Prepare Assets

You'll need:

1. **App Icon** ✅ (already created - 512x512px)

2. **Screenshots** (2-8 required)
   - Take screenshots on Android device
   - 16:9 or 9:16 ratio
   - Minimum 320px, maximum 3840px
   - Recommended: 1080 x 1920 px (portrait)

3. **Feature Graphic** (required)
   - 1024 x 500 px
   - JPG or PNG
   - No transparency

4. **Privacy Policy**
   - Must be hosted at a URL
   - Example: `https://your-domain.com/privacy-policy`

5. **App Description**
   - Short description (max 80 characters)
   - Full description (max 4000 characters)

### Upload to Play Console

1. Go to: https://play.google.com/console
2. Click "Create app"
3. Fill in app details:
   - App name: Rent Manage
   - Default language: English
   - App or game: App
   - Free or paid: Free
4. Accept declarations
5. Click "Create app"

### Complete Store Listing

**Main store listing**:
- App name: Rent Manage
- Short description: Property and tenant rent management
- Full description: [Describe your app features]
- App icon: Upload public/icon-512.png
- Feature graphic: Upload your 1024x500 image
- Screenshots: Upload 2-8 screenshots
- App category: Business
- Privacy policy: Your privacy policy URL

### Upload App Bundle

1. Go to "Production" → "Create new release"
2. Upload: `app-release-bundle.aab`
3. Add release notes
4. Review and rollout

### Content Rating

1. Go to "Content rating"
2. Complete questionnaire
3. Most likely rating: "Everyone"

### Submit for Review

1. Review all sections (must all show green checkmarks)
2. Click "Submit for review"
3. Review typically takes 1-3 days

## Updating Your App

When you update your PWA:

1. Changes are automatic (users get updates from your website)
2. Only rebuild AAB if you change:
   - App icons
   - App name
   - Permissions
   - Package name
   - Digital Asset Links

## Troubleshooting

### App doesn't open (shows Chrome instead)

**Cause**: Digital Asset Links not verified

**Fix**:
1. Verify assetlinks.json is accessible
2. Verify SHA-256 fingerprint matches
3. Wait 24 hours for Google to cache
4. Test with: https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://your-domain.com

### Build fails

**Common issues**:
- JDK not installed: Run `bubblewrap jdk`
- Gradle error: Update Bubblewrap: `npm update -g @bubblewrap/cli`
- Network error: Check internet connection

### Icons look wrong

**Fix**:
- Ensure icons are square (512x512)
- Use maskable icons for adaptive icons
- Update manifest.json and rebuild

## Important Files to Backup

- `release-key.jks` - Your signing key (CRITICAL!)
- Password for release-key.jks
- Package name: com.rentmanage.app
- SHA-256 fingerprint

## Resources

- Bubblewrap: https://github.com/GoogleChromeLabs/bubblewrap
- Play Console: https://play.google.com/console
- TWA Guide: https://developer.chrome.com/docs/android/trusted-web-activity/
- Digital Asset Links: https://developers.google.com/digital-asset-links

## Support

For issues with:
- Bubblewrap: https://github.com/GoogleChromeLabs/bubblewrap/issues
- Play Store: https://support.google.com/googleplay/android-developer
- PWA: https://web.dev/progressive-web-apps/
