# PWA Push Notifications Implementation Guide

## Overview

ZapTok has a complete PWA push notification system already implemented. This guide explains how to activate and use it.

## Current Implementation

### ✅ Already Implemented

1. **Service Worker** (`/public/sw.js`)
   - Push event handler configured
   - Notification display with custom actions
   - Support for multiple notification types (lightning, cashu, zap, comment)

2. **Push Notification Hook** (`/src/hooks/usePushNotifications.ts`)
   - Permission management
   - Subscription/unsubscription
   - Test notification functionality
   - Error handling

3. **Notification Types Supported**
   - ⚡ Lightning Payments
   - 🥜 Cashu Tokens
   - ⚡ Zaps
   - 💬 Comments
   - 👤 Follows
   - 🔄 Reposts

## Setup Steps

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

**Generate keys using web-push library:**

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

This will output:
```
Public Key: BEl62iUYgUivxIkv...
Private Key: qL8fHg5XNkWw4t...
```

### 2. Configure Environment Variables

Add your VAPID keys to `.env`:

```env
# VAPID Keys for Push Notifications
VITE_VAPID_PUBLIC_KEY=your_public_key_here

# Backend (not used in frontend)
VAPID_PRIVATE_KEY=your_private_key_here
```

### 3. Backend API Endpoints

You need to create backend API endpoints to handle subscriptions and send notifications.

#### Required Endpoints:

**POST /api/notifications/subscribe**
```typescript
// Save push subscription to database
interface SubscribeRequest {
  subscription: PushSubscriptionJSON;
  userAgent: string;
  timestamp: number;
  pubkey?: string; // Nostr pubkey
}
```

**POST /api/notifications/unsubscribe**
```typescript
// Remove subscription from database
interface UnsubscribeRequest {
  endpoint: string;
}
```

**POST /api/notifications/send**
```typescript
// Send push notification to user
interface SendNotificationRequest {
  pubkey: string; // Target user
  payload: {
    type: string;
    title: string;
    body: string;
    data?: any;
  };
}
```

**POST /api/notifications/test**
```typescript
// Send test notification
interface TestRequest {
  subscription: PushSubscriptionJSON;
  payload: NotificationPayload;
}
```

### 4. Backend Implementation Example

```typescript
import webpush from 'web-push';

// Configure web-push with your VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VITE_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Send notification
async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}
```

## Usage in Components

### Basic Usage

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';

function NotificationSettings() {
  const {
    permission,
    isSupported,
    isSubscribed,
    isSubscribing,
    error,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
  } = usePushNotifications();

  if (!isSupported) {
    return <p>Push notifications are not supported in this browser</p>;
  }

  return (
    <div>
      <h2>Push Notifications</h2>
      
      <p>Status: {permission}</p>
      <p>Subscribed: {isSubscribed ? 'Yes' : 'No'}</p>
      
      {error && <p className="text-red-500">{error}</p>}
      
      {!isSubscribed ? (
        <Button 
          onClick={subscribeToPush}
          disabled={isSubscribing}
        >
          {isSubscribing ? 'Subscribing...' : 'Enable Notifications'}
        </Button>
      ) : (
        <>
          <Button onClick={unsubscribeFromPush}>
            Disable Notifications
          </Button>
          <Button onClick={sendTestNotification}>
            Send Test
          </Button>
        </>
      )}
    </div>
  );
}
```

### Add to Settings Page

The best place to add notification settings is in your Profile or Settings page:

```tsx
// In src/pages/Profile.tsx or src/pages/Settings.tsx

import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Bell, BellOff } from 'lucide-react';

// Inside your component:
const {
  isSupported,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} = usePushNotifications();

// Add to your settings UI:
{isSupported && (
  <div className="flex items-center justify-between">
    <div>
      <h3 className="font-medium">Push Notifications</h3>
      <p className="text-sm text-gray-400">
        Get notified about zaps, comments, and more
      </p>
    </div>
    <Button
      variant={isSubscribed ? "secondary" : "default"}
      onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
    >
      {isSubscribed ? (
        <>
          <BellOff className="w-4 h-4 mr-2" />
          Disable
        </>
      ) : (
        <>
          <Bell className="w-4 h-4 mr-2" />
          Enable
        </>
      )}
    </Button>
  </div>
)}
```

## Triggering Notifications

### From Nostr Events

Monitor Nostr events and trigger notifications:

```typescript
// Example: When receiving a zap
useEffect(() => {
  const handleZapReceived = async (zapEvent: NostrEvent) => {
    // Check if user has notifications enabled
    const subscription = await getSubscription(user.pubkey);
    
    if (subscription) {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pubkey: user.pubkey,
          payload: {
            type: 'zap',
            title: '⚡ Zap Received',
            body: `${zapAmount} sats from ${senderName}`,
            data: {
              eventId: zapEvent.id,
              amount: zapAmount,
            },
          },
        }),
      });
    }
  };
  
  // Subscribe to zap events for current user
}, [user]);
```

### Notification Click Handling

The service worker already handles notification clicks in `sw.js`:

```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});
```

## Testing

### 1. Test Locally

```bash
# Start dev server with HTTPS (required for push notifications)
npm run dev -- --host

# Or use ngrok for testing
ngrok http 5173
```

### 2. Test on Mobile

- Deploy to a test URL (Vercel, Netlify)
- Or use ngrok to expose your local server
- Install PWA on mobile device
- Test notifications

### 3. Browser Testing

Push notifications work in:
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari 16.4+ (Desktop & Mobile)
- ❌ Safari < 16.4

## Troubleshooting

### Common Issues

**"Push notifications not supported"**
- Check browser compatibility
- Ensure HTTPS (required for service workers)
- Verify service worker is registered

**"Subscription failed"**
- Check VAPID key format
- Ensure service worker is active
- Check browser console for errors

**"Notifications not appearing"**
- Check notification permission is "granted"
- Verify service worker is running
- Check push event handler in sw.js

**"405 Method Not Allowed"**
- Backend API endpoints not implemented
- Check API routes are configured correctly

### Debug Commands

```javascript
// Check service worker status
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW Registration:', reg);
  return reg?.pushManager.getSubscription();
}).then(sub => {
  console.log('Push Subscription:', sub);
});

// Check notification permission
console.log('Permission:', Notification.permission);

// Send test local notification
navigator.serviceWorker.ready.then(reg => {
  reg.showNotification('Test', {
    body: 'Testing notifications',
    icon: '/images/ZapTok-v3.png',
  });
});
```

## Production Deployment

### 1. Update Service Worker Paths

In `sw.js`, update paths for production:

```javascript
const STATIC_FILES = [
  '/',
  '/manifest.webmanifest',
  '/images/ZapTok-v3.png',
];
```

### 2. Deploy Backend API

Ensure your backend is deployed and API endpoints are accessible:
- `/api/notifications/subscribe`
- `/api/notifications/unsubscribe`
- `/api/notifications/send`

### 3. Update VAPID Keys

Use production VAPID keys in your deployed environment variables.

### 4. Test End-to-End

1. Install PWA on device
2. Enable notifications in app settings
3. Trigger a test notification
4. Verify notification appears
5. Test notification click behavior

## Security Considerations

1. **VAPID Keys**: Keep private key secret, never commit to repo
2. **Subscription Storage**: Store subscriptions securely in database
3. **User Verification**: Verify user owns pubkey before sending notifications
4. **Rate Limiting**: Implement rate limits on notification endpoints
5. **Subscription Validation**: Validate subscription format before storing

## Next Steps

1. ✅ Generate VAPID keys
2. ✅ Add keys to environment variables
3. ⏳ Implement backend API endpoints
4. ⏳ Add notification settings UI to Profile/Settings page
5. ⏳ Integrate with Nostr event monitoring
6. ⏳ Test notifications on mobile devices
7. ⏳ Deploy to production

## Resources

- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [web-push library](https://github.com/web-push-libs/web-push)
