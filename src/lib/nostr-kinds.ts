// Nostr event kinds used in the application
export const KINDS = {
  // Standard kinds
  METADATA: 0,
  TEXT_NOTE: 1,
  REACTION: 7,
  
  // Group-related kinds
  GROUP: 34550,
  GROUP_COMMENT: 1111,
  GROUP_POST_APPROVAL: 4550,
  GROUP_POST_REMOVAL: 4551,
  
  // Moderation kinds
  REPORT: 1984,
  GROUP_CLOSE_REPORT: 4552,
  GROUP_JOIN_REQUEST: 4553,
  GROUP_LEAVE_REQUEST: 4554,
} as const;
