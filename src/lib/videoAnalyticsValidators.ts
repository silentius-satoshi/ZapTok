/**
 * Video Analytics Event Validators
 * 
 * Client-side validation for analytics events to ensure they actually relate to the target video.
 * Relay filtering by #e tag is imperfect and can return unrelated events.
 * 
 * References:
 * - NIP-57: Lightning Zaps (kind 9735)
 * - NIP-18: Reposts (kinds 6, 16)
 * - NIP-22: Comments (kind 1111)
 */

import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Validate that a zap receipt (kind 9735) actually relates to the target video
 * 
 * Per NIP-57, a zap receipt MUST:
 * - Have an 'e' tag pointing to the zapped event (if zapping an event vs a profile)
 * - Have a 'bolt11' tag containing the invoice
 * - Have a 'description' tag with the JSON-encoded zap request
 * 
 * @param event - The zap receipt event (kind 9735)
 * @param videoId - The video event ID we're checking zaps for
 * @returns true if the zap is valid for this video
 */
export function isValidZapForVideo(event: NostrEvent, videoId: string): boolean {
  // Must be kind 9735
  if (event.kind !== 9735) return false;

  // Must have an 'e' tag matching the video ID
  const eTag = event.tags.find((tag) => tag[0] === 'e' && tag[1] === videoId);
  if (!eTag) return false;

  // Must have a bolt11 tag (the invoice)
  const bolt11Tag = event.tags.find((tag) => tag[0] === 'bolt11');
  if (!bolt11Tag || !bolt11Tag[1]) return false;

  // Must have a description tag (the zap request)
  const descriptionTag = event.tags.find((tag) => tag[0] === 'description');
  if (!descriptionTag || !descriptionTag[1]) return false;

  return true;
}

/**
 * Validate that a repost (kind 6 or 16) actually relates to the target video
 * 
 * Per NIP-18:
 * - Kind 6: Repost of kind 1 notes, MUST have 'e' tag with the reposted note ID
 * - Kind 16: Generic repost, MUST have 'e' tag AND 'k' tag with the kind number
 * 
 * For our video events (kinds 21, 22):
 * - Kind 6 reposts should not apply (those are for kind 1 text notes)
 * - Kind 16 is the correct repost type, should have k=21 or k=22
 * 
 * @param event - The repost event (kind 6 or 16)
 * @param videoId - The video event ID we're checking reposts for
 * @returns true if the repost is valid for this video
 */
export function isValidRepostForVideo(event: NostrEvent, videoId: string): boolean {
  // Must be kind 6 or 16
  if (event.kind !== 6 && event.kind !== 16) return false;

  // Must have an 'e' tag matching the video ID
  const eTag = event.tags.find((tag) => tag[0] === 'e' && tag[1] === videoId);
  if (!eTag) return false;

  // For kind 16 (generic repost), verify it's reposting a video event (kind 21 or 22)
  if (event.kind === 16) {
    const kTag = event.tags.find((tag) => tag[0] === 'k');
    if (!kTag || !kTag[1]) return false;
    
    // Video events are kind 21 (horizontal) or 22 (vertical)
    const repostedKind = kTag[1];
    if (repostedKind !== '21' && repostedKind !== '22') return false;
  }

  // For kind 6, it should technically only be for kind 1 notes, but we'll allow it
  // Some clients might incorrectly use kind 6 for video reposts

  return true;
}

/**
 * Validate that a comment (kind 1111) is a top-level comment on the target video
 * 
 * Per NIP-22, comments use:
 * - Uppercase tags (E, K, P) to point to the ROOT scope (the video)
 * - Lowercase tags (e, k, p) to point to the PARENT (immediate parent comment)
 * 
 * For TOP-LEVEL comments on a video:
 * - Must have 'E' tag (uppercase) matching the video ID
 * - Must have 'K' tag (uppercase) with value "21" or "22" (video kinds)
 * 
 * For REPLIES to comments:
 * - Have 'E' tag pointing to root video (correct)
 * - Have 'e' tag pointing to parent comment (not the video)
 * - We should COUNT these as comments on the video
 * 
 * Note: Both top-level and replies are valid comments for the video.
 * The 'E' tag (uppercase) always points to the root video.
 * 
 * @param event - The comment event (kind 1111)
 * @param videoId - The video event ID we're checking comments for
 * @returns true if the comment is valid for this video
 */
export function isValidCommentForVideo(event: NostrEvent, videoId: string): boolean {
  // Must be kind 1111
  if (event.kind !== 1111) return false;

  // Must have an 'E' tag (uppercase - root) matching the video ID
  // This ensures the comment thread is rooted at our video
  const rootETag = event.tags.find((tag) => tag[0] === 'E' && tag[1] === videoId);
  if (!rootETag) return false;

  // Must have a 'K' tag (uppercase - root kind) with value "21" or "22"
  const rootKTag = event.tags.find((tag) => tag[0] === 'K');
  if (!rootKTag || !rootKTag[1]) return false;
  
  const rootKind = rootKTag[1];
  if (rootKind !== '21' && rootKind !== '22') return false;

  return true;
}
