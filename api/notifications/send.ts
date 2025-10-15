/**
 * Send Push Notification API
 * 
 * This endpoint sends push notifications to users based on Nostr events.
 * It retrieves the user's push subscriptions and sends notifications using
 * the Web Push protocol with VAPID authentication.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';

interface SendNotificationRequest {
  pubkey: string; // Target user's Nostr pubkey
  payload: NotificationPayload;
}

interface NotificationPayload {
  type: 'lightning-payment' | 'cashu-token' | 'zap' | 'comment' | 'follow' | 'repost';
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
  url?: string;
}

// Configure VAPID details
// In production, these should come from environment variables
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

// In-memory storage (shared with subscribe.ts in demo)
const subscriptions = new Map<string, any[]>();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pubkey, payload }: SendNotificationRequest = req.body;

    // Validate required fields
    if (!pubkey || !payload) {
      return res.status(400).json({ 
        error: 'Missing required fields: pubkey and payload'
      });
    }

    // Check VAPID configuration
    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(500).json({
        error: 'Server not configured for push notifications',
        details: 'VAPID keys not set'
      });
    }

    // Get user's subscriptions
    const userSubs = subscriptions.get(pubkey) || [];

    if (userSubs.length === 0) {
      return res.status(404).json({
        error: 'No subscriptions found for user',
        pubkey
      });
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      ...payload,
      icon: payload.icon || '/images/ZapTok-v3.png',
      badge: payload.badge || '/images/ZapTok-v3.png',
    });

    // Send to all user's subscriptions
    const results = await Promise.allSettled(
      userSubs.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription, notificationPayload);
          return { success: true, endpoint: subscription.endpoint };
        } catch (error: any) {
          // Handle subscription errors
          if (error.statusCode === 410) {
            // Subscription expired - remove it
            const filteredSubs = userSubs.filter(
              sub => sub.endpoint !== subscription.endpoint
            );
            subscriptions.set(pubkey, filteredSubs);
          }
          throw error;
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log('[Notifications] Send results:', {
      pubkey,
      type: payload.type,
      successful,
      failed,
      total: results.length
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications sent',
      results: {
        successful,
        failed,
        total: results.length
      }
    });

  } catch (error) {
    console.error('[Notifications] Send error:', error);
    return res.status(500).json({
      error: 'Failed to send notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * TODO: Production Implementation
 * 
 * 1. Database Query:
 *    SELECT * FROM push_subscriptions WHERE pubkey = $1;
 * 
 * 2. Batch Sending:
 *    For multiple users, send in batches to avoid timeout
 * 
 * 3. Queue System:
 *    Use a job queue (Redis, BullMQ) for reliable delivery
 *    Retry failed sends with exponential backoff
 * 
 * 4. Analytics:
 *    Track delivery rates, click rates, and user engagement
 * 
 * 5. Cleanup:
 *    Remove expired subscriptions (410 Gone responses)
 *    
 * 6. Rate Limiting:
 *    Limit notifications per user per time period
 *    Prevent spam and notification fatigue
 */
