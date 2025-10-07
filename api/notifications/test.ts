/**
 * Test Push Notification API
 * 
 * This endpoint sends a test notification to verify that push notifications
 * are working correctly for a user's subscription.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';

interface TestNotificationRequest {
  subscription: PushSubscriptionJSON;
  payload?: {
    type?: string;
    title?: string;
    body?: string;
    data?: any;
  };
}

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Configure VAPID details
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@zaptok.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, payload }: TestNotificationRequest = req.body;

    // Validate subscription
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ 
        error: 'Invalid subscription data'
      });
    }

    // Check VAPID configuration
    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(500).json({
        error: 'Server not configured for push notifications',
        details: 'VAPID keys not set. Please configure VITE_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.'
      });
    }

    // Default test notification payload
    const notificationPayload = {
      type: payload?.type || 'zap',
      title: payload?.title || '⚡ Test Notification',
      body: payload?.body || 'Push notifications are working! You can now receive updates about zaps, comments, and more.',
      data: {
        url: '/wallet',
        amount: 1000,
        from: 'ZapTok Test System',
        ...payload?.data
      },
      icon: '/images/ZapTok-v3.png',
      badge: '/images/ZapTok-v3.png'
    };

    // Send test notification
    await webpush.sendNotification(
      subscription,
      JSON.stringify(notificationPayload)
    );

    console.log('[Notifications] Test notification sent:', {
      endpoint: subscription.endpoint,
      title: notificationPayload.title
    });

    return res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      payload: notificationPayload
    });

  } catch (error: any) {
    console.error('[Notifications] Test error:', error);

    // Handle specific web-push errors
    if (error.statusCode === 410) {
      return res.status(410).json({
        error: 'Subscription expired',
        details: 'The push subscription has expired. Please resubscribe.'
      });
    }

    if (error.statusCode === 404) {
      return res.status(404).json({
        error: 'Subscription not found',
        details: 'The push service could not find this subscription.'
      });
    }

    return res.status(500).json({
      error: 'Failed to send test notification',
      details: error.message || 'Unknown error',
      statusCode: error.statusCode
    });
  }
}

/**
 * Usage Examples:
 * 
 * Basic test:
 * POST /api/notifications/test
 * {
 *   "subscription": { ...pushSubscription }
 * }
 * 
 * Custom test:
 * POST /api/notifications/test
 * {
 *   "subscription": { ...pushSubscription },
 *   "payload": {
 *     "title": "Custom Test",
 *     "body": "Testing with custom message",
 *     "data": { "custom": "data" }
 *   }
 * }
 */
