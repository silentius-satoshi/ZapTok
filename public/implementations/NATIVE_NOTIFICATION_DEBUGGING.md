# Native Notification Debugging Guide

## Current Issue

Notifications aren't showing in PWA mode even though:
- PWA is active
- Notification permission is granted
- Service worker controller is available

## Debugging Steps

### 1. Check Service Worker Logs

After rebuilding, open your PWA and look in the DevTools console for service worker logs:

**Expected logs when sending notification:**
```
[SW] Message received from client: {type: 'show-notification', payload: {...}}
[SW] Show notification request received
[SW] Notification payload: {title: '⚡ Test Zap', body: 'Received 1000 sats!', ...}
[SW] About to show notification with options: {...}
[SW] ✅ Notification shown successfully: ⚡ Test Zap
```

**If you don't see these logs:**
- Service worker may not be receiving the message
- Service worker may not be active
- Service worker may need to be updated

### 2. Verify Service Worker State

```javascript
// Run in console
navigator.serviceWorker.ready.then(registration => {
  console.log('Service Worker State:', registration.active?.state);
  console.log('Service Worker Script URL:', registration.active?.scriptURL);
});
```

**Expected output:**
```
Service Worker State: "activated"
Service Worker Script URL: "https://your-domain.com/sw.js"
```

### 3. Force Update Service Worker

If the service worker isn't receiving messages:

1. Open Chrome DevTools
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Find your service worker
5. Click **Update** button
6. Check **"Update on reload"** checkbox
7. Reload the page

### 4. Test Notification Manually

```javascript
// In console - test direct notification
navigator.serviceWorker.ready.then(registration => {
  registration.showNotification('Test Notification', {
    body: 'This is a test',
    icon: '/images/ZapTok-v3.png',
    badge: '/images/ZapTok-v3.png',
  }).then(() => {
    console.log('Direct notification worked!');
  }).catch(error => {
    console.error('Direct notification failed:', error);
  });
});
```

If this works but the message-based approach doesn't, the issue is with message passing.

### 5. Test Message Passing

```javascript
// In console - test sending message to service worker
if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({
    type: 'show-notification',
    payload: {
      title: '⚡ Test Zap',
      body: 'Received 1000 sats!',
      icon: '/images/ZapTok-v3.png',
      badge: '/images/ZapTok-v3.png',
      data: { url: '/wallet' },
      tag: 'test-zap',
    }
  });
  console.log('Message sent to service worker');
} else {
  console.error('No service worker controller');
}
```

**Watch for service worker logs** - they should appear immediately if working.

### 6. Check Notification Permission

```javascript
// In console
console.log('Notification permission:', Notification.permission);
console.log('Push supported:', 'PushManager' in window);
console.log('Service worker supported:', 'serviceWorker' in navigator);
console.log('Notifications supported:', 'Notification' in window);
```

**All should be:**
```
Notification permission: "granted"
Push supported: true
Service worker supported: true
Notifications supported: true
```

### 7. Check PWA Mode Detection

```javascript
// In console
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true ||
                    document.referrer.includes('android-app://');

console.log('Is PWA mode:', isStandalone);
console.log('Display mode:', window.matchMedia('(display-mode: standalone)').matches);
console.log('Navigator standalone:', window.navigator.standalone);
console.log('Referrer:', document.referrer);
```

**Expected in PWA:**
```
Is PWA mode: true
Display mode: true
```

## Common Issues & Fixes

### Issue 1: Service Worker Not Receiving Messages

**Symptom:** Message sent but no service worker logs appear

**Fix:**
1. Force update service worker (see step 3 above)
2. Clear all site data and reinstall PWA
3. Check that service worker script hasn't changed URL

### Issue 2: Notification Permission Denied

**Symptom:** `Notification.permission === 'denied'`

**Fix:**
1. Go to Site Settings in browser
2. Reset notification permission
3. Refresh page and grant permission again

### Issue 3: Service Worker Not Active

**Symptom:** `navigator.serviceWorker.controller === null`

**Fix:**
1. Reload the page
2. Check Application > Service Workers in DevTools
3. Click "Unregister" then reload page
4. Service worker should re-register

### Issue 4: Notifications Show in Browser But Not PWA

**Symptom:** Works in Chrome tab but not installed app

**Fix:**
- This is the current issue we're debugging
- Ensure service worker message handler is working
- Verify PWA is using the latest service worker version
- Check that notification code path is using service worker messages, not direct Notification API

## Testing Checklist

After rebuilding and updating service worker:

- [ ] Service worker shows "activated" state
- [ ] Service worker logs appear when message sent
- [ ] Direct `registration.showNotification()` works
- [ ] Message-based notification works from console
- [ ] Notification works from `useEventNotifications` hook
- [ ] Notification appears in system notification center
- [ ] Clicking notification opens app (if PWA is closed)
- [ ] Notification actions work (if configured)

## Next Steps

1. **Rebuild the app**: `npm run build`
2. **Update service worker**: Force update in DevTools
3. **Test from console**: Use test script above
4. **Check logs**: Look for all expected service worker logs
5. **Report findings**: What logs do you see? Which step fails?

---

*Last updated: October 2025*
