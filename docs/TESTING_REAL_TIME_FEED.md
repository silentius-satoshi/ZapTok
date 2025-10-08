# Real-Time Global Feed Testing Guide

## Overview

The global feed now includes a real-time subscription that picks up new video events as they're published to the network. This guide shows you how to test this functionality.

## Quick Access

### Option 1: Console Command (Fastest)
1. Open browser console (F12)
2. Run: `window.zapTokDebug.testPost()`
3. This opens the test post page automatically

### Option 2: Direct URL
Navigate to: `/#/test-post`

### Option 3: Manual Navigation
1. Go to Settings → Network
2. (Future: Add a "Test Post" button to the UI)

## Testing Workflow

### Step 1: Open Global Feed
1. Navigate to the Global feed (`/` or `/global`)
2. Ensure videos are loading correctly
3. Open browser console to monitor logs

### Step 2: Open Test Post Page
1. In a **new tab or window**, navigate to `/#/test-post`
2. Or run `window.zapTokDebug.testPost()` in console

### Step 3: Post a Test Video
1. Fill in the form:
   - **Title**: Any descriptive title
   - **Video URL**: A real video URL (e.g., from nostr.build)
   - **Description**: Optional test description
   
2. **Quick Option**: Click "⚡ Use Sample Data" to pre-fill with valid test data

3. Click "📤 Publish Test Video"

### Step 4: Watch Real-Time Update
1. Switch back to the **Global Feed tab**
2. Within 1-2 seconds, you should see:
   - Console logs showing real-time event processing
   - Optionally: A banner "X new videos available" (if implemented)
   - The new video appears in the feed

## Expected Console Logs

Look for these logs in the browser console:

```
🌍✅ Real-time subscription EOSE reached
🌍📹 Found NIP-71 video event: <your title>
🌍🆕 New video buffered (1 total)
🌍🔄 Merging 1 new videos
```

## Current Implementation Status

### ✅ Working Features
- Real-time subscription to global relay pool
- Event validation (NIP-71 format)
- Event buffering (up to 50 new videos)
- Automatic deduplication
- Console logging for debugging

### 🚧 Not Yet Implemented
- "X new videos" banner UI
- Manual merge button
- Auto-merge after timeout
- Visual notification of new videos

## Architecture Details

### Real-Time Subscription
- **Hook**: `useOptimizedGlobalVideoFeed`
- **Pattern**: NPool AsyncIterable (`nostr.req()`)
- **Filter**: `{kinds: [21, 22], since: <current_timestamp>}`
- **Relays**: Uses general NPool (NOT Cashu-specific)
- **Cleanup**: AbortController on component unmount

### Event Flow
1. **Published** → All configured relays
2. **Received** → Real-time subscription picks up event
3. **Validated** → NIP-71 format check + video URL validation
4. **Buffered** → Added to `newVideos` state (max 50)
5. **Merged** → (Future) User clicks banner or auto-merge

### Deduplication
- Real-time: Checks `newVideos` buffer only (not query.data)
- Merge-time: TanStack Query's refetch handles natural deduplication
- No infinite loops: Effect dependencies exclude `query.data`

## Testing Checklist

- [ ] Global feed loads successfully
- [ ] Test post page accessible via console command
- [ ] Form validation works (required fields)
- [ ] "Use Sample Data" button pre-fills correctly
- [ ] Video publishes successfully (toast notification)
- [ ] Console shows EOSE log
- [ ] Console shows event received log
- [ ] New video appears in buffer (check console)
- [ ] (Future) Banner appears with count
- [ ] (Future) Merge function integrates video into feed

## Common Issues

### Video doesn't appear
- ✅ **FIXED**: Video URL format - Now properly formatted in `imeta` tag
- Check console for validation errors
- Ensure video URL is valid and accessible (must start with http:// or https://)
- Verify relay connections (check console for NOTICE messages)
- Confirm you're logged in (required for publishing)

### Validation Error: "Missing video URL"
- ✅ **FIXED**: The test form now creates properly formatted NIP-71 events
- Video URL must be in `imeta` tag format: `['imeta', 'url <video-url>', 'm video/mp4']`
- URL must start with `http://` or `https://`

### No real-time logs
- Check console for "Real-time subscription EOSE reached"
- Verify global feed is actually using optimized hook
- Check for errors in subscription setup

### Infinite loop warning
- Should be fixed (removed query.data dependency)
- If it appears, report in issues with full console output

## Development Notes

**Files Modified:**
- `src/hooks/useOptimizedGlobalVideoFeed.ts` - Real-time subscription
- `src/components/TestVideoPost.tsx` - Test form component
- `src/pages/TestPost.tsx` - Test page
- `src/AppRouter.tsx` - Route added
- `src/lib/debug.ts` - Console helper added

**Branch:** `hybrid-global-feed`

**Next Steps:**
1. Implement "X new videos" banner UI
2. Add merge button to banner
3. Add auto-merge after 30 seconds
4. Add visual feedback (animation/pulse)
5. Test with multiple simultaneous posters
