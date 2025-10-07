# Testing Native PWA Notifications

## The Fix

The issue was that we were trying to use the `Notification` API directly from the client code, which doesn't work properly in installed PWAs. The solution (based on nsec.app's implementation) is to:

1. **Send a message from client to service worker** with the notification payload
2. **Service worker receives the message** and calls `self.registration.showNotification()`
3. This triggers a **true native notification** that appears in the system notification center

## How to Test

### 1. Test in Browser Console

Open your browser console when the PWA is installed and run:

```javascript
// Test notification from console
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
  console.log('Notification message sent to service worker');
} else {
  console.error('No service worker controller found');
}
```

### 2. Test with useEventNotifications Hook

In any component:

```typescript
import { useEventNotifications } from '@/hooks/usePushNotifications';

function TestComponent() {
  const { notifyZap } = useEventNotifications();

  const handleTest = () => {
    notifyZap(1000, 'Test zap notification');
  };

  return <button onClick={handleTest}>Test Native Notification</button>;
}
```

### 3. Test PWA Detection

Check if PWA mode is detected correctly:

```javascript
// Test PWA detection
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');

console.log('Is PWA mode:', isStandalone);
console.log('Service Worker available:', 'serviceWorker' in navigator);
console.log('Service Worker controller:', navigator.serviceWorker?.controller);
console.log('Notification permission:', Notification.permission);
```

### 4. Test Service Worker Message Reception

Add this to your service worker temporarily to see if messages are received:

```javascript
self.addEventListener('message', (event) => {
  console.log('[SW] RECEIVED MESSAGE:', event.data);
  // ... rest of handler
});
```

## Expected Behavior

### ✅ PWA Mode (Installed):
- **Detection**: `isStandalone` = true
- **Notification**: Native system notification via service worker
- **Location**: System notification center
- **Persistence**: Notification stays until dismissed
- **Actions**: Can include action buttons

### ✅ Browser Mode (Not Installed):
- **Detection**: `isStandalone` = false
- **Notification**: Toast notification (shadcn/ui)
- **Location**: Inside the app window
- **Persistence**: Auto-dismisses after 5 seconds
- **Actions**: No action buttons

## Troubleshooting

### Notification doesn't appear

1. **Check service worker**:
   ```javascript
   navigator.serviceWorker.ready.then(reg => {
     console.log('SW active:', reg.active);
     console.log('SW controller:', navigator.serviceWorker.controller);
   });
   ```

2. **Check notification permission**:
   ```javascript
   console.log('Permission:', Notification.permission);
   // If 'default' or 'denied', need to request permission
   ```

3. **Check browser console for errors** in both:
   - Main app console (F12)
   - Service worker console (DevTools → Application → Service Workers → inspect)

### Permission issues

If `Notification.permission` is not 'granted':

```javascript
// Request permission
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission);
});
```

### Service worker not active

1. Unregister and re-register service worker:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```

2. Reload the page
3. Check if new service worker activates

### Messages not received by service worker

1. Check service worker console (DevTools → Application → Service Workers)
2. Look for "[SW] Message received from client:" logs
3. If missing, service worker might not be the active controller

## Verification Checklist

- [ ] Notification permission granted
- [ ] Service worker registered and active
- [ ] `navigator.serviceWorker.controller` is not null
- [ ] PWA mode detected correctly (check standalone status)
- [ ] Message handler in service worker receives messages
- [ ] Service worker calls `self.registration.showNotification()`
- [ ] Native notification appears in system notification center
- [ ] Clicking notification opens/focuses the app
- [ ] Browser mode falls back to toast notifications

## Key Code Changes

**Before** (didn't work in PWA):
```typescript
const notification = new Notification(title, options);
```

**After** (works in PWA):
```typescript
navigator.serviceWorker.controller.postMessage({
  type: 'show-notification',
  payload: { title, body, icon, ... }
});
```

**Service Worker Handler**:
```javascript
self.addEventListener('message', (event) => {
  if (event.data.type === 'show-notification') {
    self.registration.showNotification(
      event.data.payload.title,
      event.data.payload
    );
  }
});
```

## References

- Implementation based on: https://github.com/nostrband/noauth
- Specifically: `packages/client/src/modules/sw.ts` lines 233-277, 365-392
- Service worker notifications: https://web.dev/articles/push-notifications-common-notification-patterns
