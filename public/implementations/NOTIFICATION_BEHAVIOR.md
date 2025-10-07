# Notification Behavior: PWA vs Browser Mode

## Overview

ZapTok uses different notification strategies depending on how the app is accessed:

- **PWA Mode (Installed App)**: Native push notifications with system-level alerts
- **Browser Mode (Web)**: Toast notifications within the app interface

## How It Works

### Detection

The app automatically detects the display mode using:

```typescript
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');
```

### PWA Mode (Installed)

When running as an installed PWA:

✅ **Uses**: Native system notifications
✅ **Benefits**:
- Notifications appear even when app is closed
- System notification tray integration
- Notification actions (buttons)
- Badge counter on app icon
- Persistent notifications

**Example**: User receives a zap → System notification appears in notification center

### Browser Mode (Regular Web)

When running in a browser tab:

✅ **Uses**: Toast notifications (shadcn/ui)
✅ **Benefits**:
- No permission prompts required
- Lightweight and non-intrusive
- Works without service worker registration
- Consistent with in-app UI design
- Appears inside the app window

**Example**: User receives a zap → Toast notification slides in within the app

## Notification Types

Both modes support the same notification types:

1. **Lightning Payments** (⚡)
2. **Cashu Tokens** (🥜)
3. **Zaps** (⚡)
4. **Comments** (💬)
5. **Follows** (👤)
6. **Reposts** (🔁)

## Implementation

### Showing Notifications

```typescript
import { showLocalNotification } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/useToast';

function MyComponent() {
  const { toast } = useToast();

  const sendNotification = () => {
    showLocalNotification({
      type: 'zap',
      title: '⚡ Zap Received',
      body: 'Someone zapped your content!',
      data: { url: '/wallet' }
    }, toast);
  };

  // PWA mode → Native notification
  // Browser mode → Toast notification
}
```

### Using the Hook

```typescript
import { useEventNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { notifyZap, notifyComment } = useEventNotifications();

  // Automatically handles PWA vs browser mode
  notifyZap(1000); // Shows appropriate notification type
}
```

## Fallback Strategy

The notification system has multiple fallback levels:

```
1. Push Notification (subscribed + PWA)
   ↓ (if not subscribed)
2. Native Notification (PWA mode + permission granted)
   ↓ (if browser mode OR no permission)
3. Toast Notification (always works)
```

## User Experience

### First-Time Users (Browser)

1. Visit ZapTok in browser
2. Receive events → **Toast notifications** appear
3. No permission prompts or setup needed

### Power Users (PWA)

1. Install ZapTok as PWA
2. Grant notification permission (optional)
3. Receive events → **Native notifications** appear
4. Get notifications even when app is closed

### Transition

When a user installs the PWA:
- Automatically switches to native notifications
- No code changes needed
- Seamless upgrade from toast to push

## Benefits of Dual Approach

✅ **Progressive Enhancement**: Basic users get toasts, power users get native notifications
✅ **No Barriers**: Works immediately without permissions
✅ **Privacy-Friendly**: Users choose their notification level
✅ **Cross-Platform**: Works on desktop and mobile
✅ **Graceful Degradation**: Always has a working fallback

## Testing

### Test PWA Mode

1. Install ZapTok as PWA
2. Trigger a notification event
3. Verify native system notification appears

### Test Browser Mode

1. Open ZapTok in regular browser tab
2. Trigger a notification event
3. Verify toast notification appears in app

### Test Fallback

1. Open PWA without notification permission
2. Trigger a notification event
3. Verify it falls back to toast

## Configuration

No configuration needed! The system automatically:
- Detects display mode
- Checks permissions
- Selects appropriate notification method
- Provides fallbacks

## Future Enhancements

Potential improvements:

- User preference toggle (force toast or push)
- Notification grouping in browser mode
- Rich media in toasts (images, videos)
- Custom notification sounds
- Notification history view
- Per-event-type notification settings

---

*Last updated: October 2025*
