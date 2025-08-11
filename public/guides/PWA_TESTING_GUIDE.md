# PWA Testing Guide for ZapTok

This guide will help you verify that the Progressive Web App features are working correctly for real users.

## Quick Access to PWA Testing

1. **Start the development server**: `npm run dev`
2. **Go to Settings**: Navigate to Settings in the app
3. **Select "PWA & Installation"**: This opens the PWA testing interface

## Testing Categories

### 1. Service Worker Functionality ⚙️

**What to Check:**
- Service Worker registration and activation
- Cache creation and management
- Background sync capabilities
- Update mechanisms

**How to Test:**
- Open DevTools > Application > Service Workers
- Check if ZapTok service worker is registered and active
- Look for cache entries in Cache Storage
- Try refreshing the page with network throttling

**Expected Results:**
- Service worker shows as "activated and running"
- Multiple cache entries (static, dynamic)
- Page loads even with poor network conditions

### 2. PWA Installation 📱

**What to Check:**
- Installation prompt availability
- Native app-like behavior when installed
- Icon and manifest correctness

**How to Test:**

#### Desktop (Chrome/Edge):
1. Look for install icon in address bar
2. Click to install ZapTok
3. Verify app opens in standalone window
4. Check app icon appears in applications

#### Mobile (iOS Safari):
1. Tap Share button
2. Select "Add to Home Screen"
3. Confirm app appears on home screen
4. Open from home screen (should be fullscreen)

#### Mobile (Android Chrome):
1. Look for "Add to Home screen" banner
2. Tap "Install" when prompted
3. Verify app installs like native app

**Expected Results:**
- Install prompts appear automatically
- App opens in standalone mode (no browser UI)
- App icon matches ZapTok branding
- Status bar shows app theme color (orange)

### 3. Push Notifications 🔔

**What to Check:**
- Notification permission requests
- Push subscription creation
- Real-time Lightning notifications
- Background notification delivery

**How to Test:**

#### Permission & Subscription:
1. Go to PWA Settings > Notifications
2. Toggle "Enable Notifications"
3. Grant permission when prompted
4. Verify subscription is created

#### Test Notifications:
1. Click "Send Test" button
2. Check notification appears immediately
3. Test with app in background
4. Test with app closed completely

#### Lightning Event Notifications:
1. Make a Lightning payment in another app
2. Verify ZapTok shows notification
3. Click notification to open app
4. Confirm app opens to relevant screen

**Expected Results:**
- Permission dialog appears correctly
- Test notifications show immediately
- Notifications work when app is backgrounded
- Lightning events trigger real-time alerts
- Click actions open app to correct page

### 4. Offline Functionality 🌐

**What to Check:**
- Offline page loading
- Cached video playback
- Service worker cache strategies
- Background sync for failed transactions

**How to Test:**

#### Basic Offline Access:
1. Load ZapTok normally
2. Turn on airplane mode (or disconnect internet)
3. Refresh the page
4. Navigate between cached pages

#### Video Caching:
1. Watch some videos while online
2. Go offline
3. Try to replay previously watched videos
4. Check if thumbnails load from cache

#### Background Sync:
1. Go offline
2. Try to send a Lightning payment (should queue)
3. Go back online
4. Verify payment processes automatically

**Expected Results:**
- App loads basic interface when offline
- Previously viewed videos play from cache
- Thumbnails and profile images load from cache
- Failed transactions retry when back online

### 5. Protocol Handlers 🔗

**What to Check:**
- Lightning URI handling (lightning:...)
- Nostr URI handling (nostr:...)
- Share target functionality

**How to Test:**

#### Lightning URIs (if supported by browser):
1. Click a `lightning:lnbc...` link
2. Verify ZapTok offers to handle it
3. Confirm it opens payment interface

#### Share Target (Android):
1. Try sharing a video file from another app
2. Select ZapTok as share target
3. Verify upload interface opens

**Expected Results:**
- Browser recognizes ZapTok as protocol handler
- Lightning links open payment interface
- Video sharing works seamlessly

## Browser-Specific Testing

### Chrome/Chromium
- ✅ Full PWA support
- ✅ Installation prompts
- ✅ Push notifications
- ✅ Background sync

### Safari (iOS)
- ✅ Add to Home Screen
- ⚠️ Limited push notifications
- ⚠️ No background sync
- ✅ Offline caching

### Firefox
- ⚠️ Limited PWA features
- ❌ No installation prompts
- ⚠️ Basic service worker support
- ✅ Offline caching

### Edge
- ✅ Full PWA support (same as Chrome)
- ✅ Installation prompts
- ✅ Push notifications

## Debugging Tools

### Browser DevTools
1. **Application Tab**:
   - Service Workers status
   - Cache Storage contents
   - Manifest validation

2. **Network Tab**:
   - Service worker intercepted requests
   - Cache hits vs network requests

3. **Console**:
   - Service worker logs (look for `[SW]` prefix)
   - PWA hook logs (look for `[PWA]` prefix)

### ZapTok PWA Debug Interface
1. **Go to Settings > PWA & Installation > Debug & Testing**
2. **Click "Run Tests"** to get comprehensive status
3. **Check each tab** for detailed test results
4. **Use action buttons** to test specific features

## Common Issues & Solutions

### "Install button doesn't appear"
- Check if already installed
- Try incognito/private browsing
- Verify manifest.json loads correctly
- Check HTTPS requirement

### "Notifications don't work"
- Verify permission granted
- Check if browser supports push
- Test with different networks
- Try clearing site data and re-subscribing

### "App doesn't work offline"
- Check service worker registration
- Verify cache creation
- Test with different network conditions
- Check cache storage in DevTools

### "Updates don't install"
- Check for update notifications
- Try manual refresh
- Clear cache if stuck
- Check service worker update logic

## Success Metrics

✅ **Installation Success**:
- Install prompts appear naturally
- App opens in standalone mode
- Icon appears in app launcher/home screen

✅ **Notification Success**:
- Test notifications deliver instantly
- Background notifications work
- Lightning events trigger alerts

✅ **Offline Success**:
- Basic app functions when offline
- Previously viewed content accessible
- Graceful degradation for unavailable features

✅ **Performance Success**:
- Fast initial load (< 3 seconds)
- Smooth navigation
- Quick video start playback

## User Feedback Collection

Ask test users to verify:
1. "Does the install process feel native?"
2. "Do notifications arrive when expected?"
3. "Can you use core features when offline?"
4. "Does it feel like a native app vs web page?"

## Production Deployment Notes

Before going live:
1. ✅ Test on multiple devices/browsers
2. ✅ Verify HTTPS requirement met
3. ✅ Configure VAPID keys for push notifications
4. ✅ Test with real Lightning transactions
5. ✅ Monitor service worker update deployment
6. ✅ Set up notification server endpoints

---

**Remember**: PWA features vary by browser and platform. Always test on the actual devices and browsers your users will use!
