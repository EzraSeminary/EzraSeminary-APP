# FCM Notifications Not Working in Play Store Release - COMPLETE FIX

## Problem Summary
- ✅ Notifications work in emulator
- ✅ Notifications work with APK from `assembleRelease` on physical device
- ❌ Notifications DON'T work with AAB from `bundleRelease` after Play Store release

## Root Cause Analysis

### Why This Happens

When you upload an AAB to Google Play Store with **App Signing by Google Play** enabled (default for new apps), Google does the following:

1. Takes your AAB signed with your **upload key** (ezraseminary.keystore)
2. Strips your signature
3. Re-signs the app with Google's own **app signing key** (which you don't have)
4. Distributes the re-signed APK to users

**The Problem:** Firebase Cloud Messaging uses the app's certificate SHA-1 fingerprint to validate push notification requests. When Google re-signs your app, the SHA-1 changes, and Firebase rejects notifications because it only knows about your original upload key's SHA-1.

### Why assembleRelease Works

When you use `./gradlew assembleRelease`, you generate an APK signed with YOUR upload key directly. You manually install this APK on the device, bypassing Play Store's re-signing process. Firebase recognizes your upload key's SHA-1, so notifications work.

---

## THE COMPLETE FIX (Step-by-Step)

### Step 1: Get Google Play's App Signing Certificate

1. Go to [Google Play Console](https://play.google.com/console/)
2. Select your app (EzraApp)
3. Navigate to: **Setup** → **App Integrity**
4. Scroll down to **App signing key certificate** section
5. You'll see TWO certificates:
   - **App signing key certificate** ← THIS IS THE ONE YOU NEED
   - **Upload key certificate** ← You already have this in Firebase

6. Copy BOTH fingerprints from **App signing key certificate**:
   ```
   SHA-1 certificate fingerprint: XX:XX:XX:XX:... (40 characters)
   SHA-256 certificate fingerprint: YY:YY:YY:YY:... (64 characters)
   ```

### Step 2: Add Play Store Certificates to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → **Project settings**
4. Scroll to **Your apps** section
5. Find your Android app (com.ezraapp)
6. Under **SHA certificate fingerprints**, click **Add fingerprint**
7. Paste the **SHA-1** from Play Store's App signing key
8. Click **Add fingerprint** again
9. Paste the **SHA-256** from Play Store's App signing key
10. You should now see at least 2 SHA fingerprints (your upload key + Play Store's key)

### Step 3: Verify Your Upload Key is Also Present

Your development builds and `assembleRelease` APKs use your upload key. Verify it's in Firebase:

```bash
# Get your upload key SHA-1
cd android/app
keytool -list -v -keystore ezraseminary.keystore -alias ezraseminary

# When prompted, enter your keystore password
# Look for these lines:
# Certificate fingerprints:
#      SHA1: AA:BB:CC:DD:...
#      SHA256: 11:22:33:44:...
```

If these SHA fingerprints are NOT in Firebase, add them too using the same process as Step 2.

### Step 4: Download Updated google-services.json

**CRITICAL:** After adding fingerprints, Firebase generates a new `google-services.json` file.

1. In Firebase Console → Project settings → Your Android app
2. Click **Download google-services.json** button
3. Replace your current file:
   ```bash
   # Backup old file
   cp android/app/google-services.json android/app/google-services.json.backup
   
   # Copy new file from Downloads
   cp ~/Downloads/google-services.json android/app/google-services.json
   ```

### Step 5: Rebuild and Re-upload

```bash
cd android

# Clean build
./gradlew clean

# Generate release AAB
./gradlew bundleRelease

# Find your AAB at:
# android/app/build/outputs/bundle/release/app-release.aab
```

### Step 6: Test with Internal Testing Track

**IMPORTANT:** Don't release directly to production. Test first!

1. Upload `app-release.aab` to Play Console → **Internal testing** track
2. Add yourself as a tester
3. Install via Play Store Internal Testing link
4. Test notifications:
   - Local notifications (from app settings)
   - Remote notifications (from your server or Firebase Console)

### Step 7: Verify FCM Token Registration

When testing, check Metro logs:

```bash
# Look for these logs:
RemotePush service initialized successfully
FCM Token: [your-token]
Subscribed to topic: all-users
```

If you see errors, notifications won't work.

---

## ProGuard/R8 Protection

I've already added Firebase keep rules to `android/app/proguard-rules.pro` to prevent code stripping:

```proguard
# Firebase Cloud Messaging Rules
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keep class io.invertase.firebase.** { *; }
-keep class app.notifee.** { *; }
```

These ensure Firebase classes aren't obfuscated or removed in release builds.

---

## Verification Checklist

After uploading the new AAB to Internal Testing:

- [ ] App installs from Play Store Internal Testing
- [ ] Go to Settings → Notification Settings
- [ ] Press "Send Test Notification" → Should receive notification
- [ ] Pick a notification time → Should schedule daily notification
- [ ] Send notification from your server (`POST /send-to-all`) → Should receive
- [ ] Send notification from Firebase Console → Should receive
- [ ] Check Metro logs for `FCM Token: ...` and `RemotePush service initialized`

---

## Common Mistakes to Avoid

1. ❌ **Using Upload certificate SHA instead of App signing SHA**
   - Upload certificate = your keystore
   - App signing certificate = Google's keystore (what users get)
   - You need BOTH in Firebase

2. ❌ **Not downloading updated google-services.json**
   - After adding SHA fingerprints, you MUST download the new file
   - The file contains updated OAuth client IDs for FCM

3. ❌ **Testing with side-loaded APK instead of Play Store**
   - Always test via Play Store Internal Testing track
   - Side-loaded APKs bypass Play Store signing

4. ❌ **Missing ProGuard keep rules**
   - Already fixed in your proguard-rules.pro

5. ❌ **Not waiting for Firebase configuration to propagate**
   - After adding SHA fingerprints, wait 5-10 minutes before testing

---

## Debug Commands

### Check FCM Token on Device

Add this temporarily to `App.js` after `RemotePush.init()`:

```javascript
RemotePush.getFcmToken().then(token => {
  console.log('=== FCM TOKEN FOR TESTING ===');
  console.log(token);
  console.log('=============================');
});
```

### Test Notification from Firebase Console

1. Firebase Console → Cloud Messaging → Send your first message
2. Target: Single device
3. Paste FCM token from logs
4. Title: "Test from Firebase"
5. Body: "If you see this, FCM is working!"
6. Send

### Test Notification from Your Server

```bash
# Make sure your server is running
node server.js

# Send test push
curl -X POST http://localhost:3000/send-to-topic \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "all-users",
    "title": "Test from Server",
    "body": "Server push working!",
    "data": {
      "type": "general"
    }
  }'
```

---

## iOS Considerations

Your app also has iOS. For iOS push notifications to work in production:

1. Create APNs Auth Key (`.p8` file) in Apple Developer
2. Upload to Firebase → Project Settings → Cloud Messaging → iOS
3. Add Team ID and Key ID
4. Rebuild iOS app

---

## Still Not Working?

If notifications still don't work after following all steps:

1. Check Play Console → App Integrity → Make sure "App signing by Google Play" is enabled
2. Verify you added the **App signing key** SHA, not the Upload key SHA
3. Wait 10-15 minutes after updating Firebase (configuration takes time to propagate)
4. Uninstall the app completely and reinstall from Play Store
5. Check device logs: `adb logcat | grep -i fcm`

---

## Summary

**The key insight:** Google Play Store re-signs your AAB with a different certificate. Firebase needs to know about BOTH certificates:
- Your upload key (for development and assembleRelease)
- Google's app signing key (for Play Store releases)

Add both SHA-1/SHA-256 fingerprints to Firebase, download the updated `google-services.json`, rebuild, and upload a new AAB to Internal Testing to verify.

