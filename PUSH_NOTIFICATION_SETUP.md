# EzraApp Push Notification Setup Guide

## Complete Setup for Web-to-App Push Notifications

This guide will help you set up Firebase Cloud Messaging (FCM) to send push notifications from a web dashboard to your EzraApp.

## Prerequisites

- ✅ Firebase project already configured (`ezra-seminary-ffc4e`)
- ✅ Android `google-services.json` in place
- ✅ iOS `GoogleService-Info.plist` in place
- ✅ React Native Firebase dependencies installed
- ✅ iOS deployment target updated to 15.0

## 1. Firebase Console Setup

### iOS APNs Configuration
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `ezra-seminary-ffc4e`
3. Go to **Project Settings** → **Cloud Messaging**
4. Under **iOS app configuration**:
   - Upload your APNs key (.p8 file) or certificates
   - Ensure bundle ID matches: `com.ezraapp` (check your iOS project)

### Android Configuration
- Already configured with `google-services.json`

## 2. Server Setup

### Option A: Use the Provided Node.js Server

1. **Install server dependencies:**
   ```bash
   cd /Users/amanwtsegaw/Desktop/Melak_Project/Application/Test/EzraApp
   cp server-package.json package.json
   npm install
   ```

2. **Get Firebase Service Account Key:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download `serviceAccountKey.json`
   - Place it in your project root

3. **Start the server:**
   ```bash
   node server.js
   ```
   - Server runs on `http://localhost:3000`
   - Web dashboard available at `http://localhost:3000`

### Option B: Use Firebase Console (Simple Testing)

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and message
4. Select "Send test message"
5. Enter FCM token from app console

## 3. App Testing

### Get FCM Token
1. **Run your app:**
   ```bash
   npx react-native run-ios
   # or
   npx react-native run-android
   ```

2. **Check console logs** for:
   ```
   FCM Token: [long-token-string]
   Remote push initialized with token: [token]
   Token registered with server: Token registered successfully
   ```

3. **Copy the FCM token** for testing

### Test Notifications

#### Method 1: Web Dashboard
1. Open `http://localhost:3000` in browser
2. Paste FCM token
3. Fill in title and message
4. Click "Send Notification"

#### Method 2: Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter details and FCM token
4. Send test message

#### Method 3: API Calls
```bash
# Send to specific token
curl -X POST http://localhost:3000/send-to-token \
  -H "Content-Type: application/json" \
  -d '{
    "token": "FCM_TOKEN_HERE",
    "title": "Test Notification",
    "body": "This is a test from the server!",
    "data": {"type": "general"}
  }'

# Send to all registered tokens
curl -X POST http://localhost:3000/send-to-all \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Broadcast Message",
    "body": "This goes to all users!",
    "data": {"type": "general"}
  }'
```

## 4. Production Deployment

### Server Deployment
1. **Deploy to cloud service** (Heroku, AWS, DigitalOcean, etc.)
2. **Update server URL** in `src/services/RemotePush.js`:
   ```javascript
   const serverUrl = 'https://your-production-server.com';
   ```

3. **Environment variables:**
   ```bash
   export PORT=3000
   export NODE_ENV=production
   ```

### App Configuration
1. **Update server URL** in RemotePush.js
2. **Test on real devices** (push notifications don't work in simulators)
3. **Verify APNs configuration** for iOS

## 5. Notification Types

The app supports different notification channels:

- **General**: `general` channel
- **Daily Verse**: `daily-verse` channel
- **Devotional**: `devotional` type
- **Course**: `course` type

### Example Notification Payloads

```javascript
// Daily verse notification
{
  "token": "FCM_TOKEN",
  "title": "📖 Daily Verse",
  "body": "Trust in the Lord with all your heart...",
  "data": {
    "type": "daily-verse",
    "screen": "Devotional"
  }
}

// Course update notification
{
  "token": "FCM_TOKEN", 
  "title": "New Course Available",
  "body": "Check out the latest Bible study course!",
  "data": {
    "type": "course",
    "courseId": "123",
    "screen": "Course"
  }
}
```

## 6. Troubleshooting

### Common Issues

1. **"No registered tokens found"**
   - Ensure app is running and token is registered
   - Check server logs for registration attempts

2. **iOS notifications not appearing**
   - Verify APNs key is uploaded to Firebase
   - Check bundle ID matches
   - Test on real device (not simulator)

3. **Android notifications not appearing**
   - Check notification permissions
   - Verify `google-services.json` is correct
   - Check notification channels are created

4. **Token registration fails**
   - Check server is running
   - Verify network connectivity
   - Check server logs for errors

### Debug Steps

1. **Check app logs:**
   ```bash
   npx react-native log-ios
   # or
   npx react-native log-android
   ```

2. **Check server logs:**
   ```bash
   node server.js
   # Look for registration and sending logs
   ```

3. **Test token validity:**
   ```bash
   curl -X POST http://localhost:3000/send-to-token \
     -H "Content-Type: application/json" \
     -d '{"token": "YOUR_TOKEN", "title": "Test", "body": "Test"}'
   ```

## 7. Advanced Features

### Topic Subscriptions
```javascript
// Subscribe to topics
await subscribeTopic('all-users');
await subscribeTopic('devotional-updates');

// Send to topic
curl -X POST http://localhost:3000/send-to-topic \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "all-users",
    "title": "Weekly Update",
    "body": "New content available!"
  }'
```

### Scheduled Notifications
Use Firebase Functions or your server's cron jobs to send scheduled notifications.

### Rich Notifications
Add images, actions, and custom data to notifications for enhanced user experience.

## 8. Security Considerations

1. **Protect service account key** - never commit to version control
2. **Use environment variables** for sensitive data
3. **Implement authentication** for production API endpoints
4. **Rate limiting** to prevent abuse
5. **Token validation** before sending notifications

## 9. Monitoring

- **Firebase Console** → Cloud Messaging → Reports
- **Server logs** for delivery status
- **App analytics** for notification engagement

## Support

If you encounter issues:
1. Check Firebase Console for error messages
2. Review server and app logs
3. Test with Firebase Console first
4. Verify all configuration steps

---

**Next Steps:**
1. Start the server: `node server.js`
2. Run your app and get FCM token
3. Test notifications via web dashboard
4. Deploy to production when ready

