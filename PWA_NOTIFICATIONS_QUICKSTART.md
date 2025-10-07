# PWA Push Notifications - Quick Start

## ✅ What's Already Built

Your ZapTok app already has a **complete push notification system** implemented:

1. ✅ Service Worker with push handlers (`/public/sw.js`)
2. ✅ Push notification hook (`/src/hooks/usePushNotifications.ts`)
3. ✅ Settings UI component (`/src/components/NotificationSettings.tsx`)
4. ✅ Support for multiple notification types (zaps, comments, follows, etc.)

## 🚀 To Make It Work (3 Steps)

### Step 1: Generate VAPID Keys (2 minutes)

```bash
# Install web-push CLI
npm install -g web-push

# Generate keys
web-push generate-vapid-keys
```

Copy the output keys.

### Step 2: Add Keys to Environment (1 minute)

Create/update `.env` file:

```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

### Step 3: Add Settings UI to Profile Page (5 minutes)

Add to `/src/pages/Profile.tsx`:

```tsx
import { NotificationSettings } from '@/components/NotificationSettings';

// Inside your Profile component, add this section:
{isOwnProfile && (
  <div className="mt-6">
    <NotificationSettings />
  </div>
)}
```

## ⚠️ What's Missing (Backend)

Push notifications require a backend server to send notifications. You have two options:

### Option A: Simple Testing (No Backend)

For testing, the `sendTestNotification()` function uses the browser's service worker to show local notifications. This works immediately without a backend.

```tsx
// This works right away:
<Button onClick={sendTestNotification}>Test Notification</Button>
```

### Option B: Full Implementation (With Backend)

To send real push notifications from Nostr events, you need:

1. **Backend API** to store subscriptions and send push messages
2. **web-push library** on the server
3. **Database** to store user subscriptions

See `/public/docs/PWA_PUSH_NOTIFICATIONS_GUIDE.md` for complete backend setup.

## 📱 Quick Test (Without Backend)

1. Add VAPID key to `.env`
2. Add `<NotificationSettings />` to Profile page
3. Run `npm run dev`
4. Visit your profile
5. Click "Enable Notifications"
6. Click "Send Test" - you'll see a local notification!

## 📖 Full Documentation

See `/public/docs/PWA_PUSH_NOTIFICATIONS_GUIDE.md` for:
- Complete backend implementation
- Security best practices
- Production deployment guide
- Troubleshooting tips

## 🎯 Next Steps

1. **Immediate**: Add VAPID key and Settings UI to test locally
2. **Soon**: Implement backend API for real push notifications
3. **Later**: Integrate with Nostr events to trigger notifications automatically
