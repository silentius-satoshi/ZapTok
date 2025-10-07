/**
 * Push Notification Subscription API
 * 
 * This endpoint handles storing push notification subscriptions for users.
 * When a user enables notifications, their browser's push subscription is sent here
 * and stored in the database associated with their Nostr pubkey.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Type definitions
interface SubscriptionRequest {
  subscription: PushSubscriptionJSON;
  userAgent: string;
  timestamp: number;
  pubkey?: string;
}

interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// In-memory storage for demo (replace with database in production)
// Structure: Map<pubkey, PushSubscription[]>
const subscriptions = new Map<string, PushSubscriptionJSON[]>();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, userAgent, timestamp, pubkey }: SubscriptionRequest = req.body;

    // Validate required fields
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ 
        error: 'Invalid subscription data',
        details: 'Subscription must include endpoint and keys'
      });
    }

    // For demo purposes, use endpoint as identifier if no pubkey provided
    // In production, you should require authentication and use the pubkey
    const userId = pubkey || subscription.endpoint;

    // Get existing subscriptions for this user
    const userSubs = subscriptions.get(userId) || [];

    // Check if this subscription already exists (by endpoint)
    const existingIndex = userSubs.findIndex(
      sub => sub.endpoint === subscription.endpoint
    );

    if (existingIndex >= 0) {
      // Update existing subscription
      userSubs[existingIndex] = subscription;
    } else {
      // Add new subscription
      userSubs.push(subscription);
    }

    // Store updated subscriptions
    subscriptions.set(userId, userSubs);

    console.log('[Notifications] Subscription saved:', {
      userId,
      endpoint: subscription.endpoint,
      userAgent,
      timestamp
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription saved successfully',
      subscriptionCount: userSubs.length
    });

  } catch (error) {
    console.error('[Notifications] Subscribe error:', error);
    return res.status(500).json({
      error: 'Failed to save subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * TODO: Production Implementation
 * 
 * 1. Database Storage:
 *    Replace in-memory Map with a proper database (PostgreSQL, MongoDB, etc.)
 *    
 *    Schema example:
 *    CREATE TABLE push_subscriptions (
 *      id SERIAL PRIMARY KEY,
 *      pubkey VARCHAR(64) NOT NULL,
 *      endpoint TEXT NOT NULL,
 *      p256dh TEXT NOT NULL,
 *      auth TEXT NOT NULL,
 *      user_agent TEXT,
 *      created_at TIMESTAMP DEFAULT NOW(),
 *      updated_at TIMESTAMP DEFAULT NOW(),
 *      UNIQUE(pubkey, endpoint)
 *    );
 * 
 * 2. Authentication:
 *    Verify the user's Nostr pubkey by checking a signed event or session token
 *    
 * 3. Rate Limiting:
 *    Limit subscriptions per user and requests per IP
 *    
 * 4. Cleanup:
 *    Periodically remove expired or invalid subscriptions
 *    Handle unsubscribe events from browsers
 */
