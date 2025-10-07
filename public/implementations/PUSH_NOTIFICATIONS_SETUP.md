# Push Notifications Setup - Quick Start

## Step 1: Generate VAPID Keys

VAPID keys are required for web push notifications. Generate them using the web-push CLI:

```bash
# The web-push package is already installed in this project
npx web-push generate-vapid-keys
```

This will output something like:
```
=======================================

Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xQmrHP5x5Z1SvtXf8wc39dPVBWiIlZqN6c3cKpLW5H9yYc8Z7v1fA

Private Key:
qL8fHg5XNkWw4tY9pZ3vR8sN2mK6hD4fG7jL9nM1pQ3wX5yA7bC9dE1fH3jK5lN7o

=======================================
```

## Step 2: Add Environment Variables

Create or update your `.env` file in the project root:

```env
# Push Notification VAPID Keys
VITE_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

**Important Notes:**
- `VITE_VAPID_PUBLIC_KEY` is used in the frontend (starts with `VITE_`)
- `VAPID_PRIVATE_KEY` is used ONLY in backend API routes (keep it secret!)
- `VAPID_SUBJECT` should be your contact email
- **Never commit `.env` file to git** (it's already in `.gitignore`)

## Step 3: Test the Implementation

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Navigate to Your Profile

Go to `http://localhost:5173/profile` (or your own profile URL)

### 3. Enable Notifications

Scroll down to the "Push Notifications" section and click "Enable Notifications"

### 4. Send a Test Notification

After enabling, click the "Send Test" button. You should see a notification!

## API Endpoints

Your project now has these endpoints:

### Subscribe to Notifications
```
POST /api/notifications/subscribe
Body: { subscription, userAgent, timestamp, pubkey }
```

### Unsubscribe from Notifications
```
POST /api/notifications/unsubscribe
Body: { endpoint, pubkey }
```

### Send Notification to User
```
POST /api/notifications/send
Body: { pubkey, payload }
```

### Send Test Notification
```
POST /api/notifications/test
Body: { subscription, payload }
```

## Troubleshooting

### "Server not configured for push notifications"

**Problem**: VAPID keys are not set in environment variables.

**Solution**: 
1. Generate VAPID keys using `npx web-push generate-vapid-keys`
2. Add them to `.env` file
3. Restart the dev server

### "Push notifications are not supported in your browser"

**Problem**: Browser doesn't support push notifications.

**Solution**: Use Chrome, Firefox, or Safari 16.4+

### "Permission denied"

**Problem**: User blocked notifications.

**Solution**: 
1. Click the lock icon in the browser address bar
2. Change notification permission to "Allow"
3. Refresh the page

### Test notification not appearing

**Problem**: Various possible causes.

**Debug steps**:
1. Open browser DevTools Console
2. Look for errors in the console
3. Check if service worker is registered: `navigator.serviceWorker.getRegistration()`
4. Verify notification permission: `console.log(Notification.permission)`

## Production Deployment

### Vercel Deployment

1. Add environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`
   - Make sure to add them for all environments (Production, Preview, Development)

2. Redeploy your app

### Database Setup (Recommended for Production)

The current implementation uses in-memory storage which will reset on every deployment. For production:

1. Set up a database (PostgreSQL, MongoDB, etc.)
2. Update the API endpoints to store subscriptions in the database
3. See `/public/docs/PWA_PUSH_NOTIFICATIONS_GUIDE.md` for database schema

## Next Steps

1. ✅ Generate VAPID keys
2. ✅ Add keys to `.env`
3. ✅ Test locally
4. ⏳ Integrate with Nostr events (zaps, comments, etc.)
5. ⏳ Set up database for production
6. ⏳ Deploy to production with environment variables

## Security Reminders

- ✅ Never commit `.env` file
- ✅ Keep `VAPID_PRIVATE_KEY` secret (backend only)
- ✅ Only `VITE_VAPID_PUBLIC_KEY` should be public (frontend)
- ✅ Add authentication to API endpoints in production
- ✅ Implement rate limiting to prevent abuse

## Questions?

See the full documentation in `/public/docs/PWA_PUSH_NOTIFICATIONS_GUIDE.md`
