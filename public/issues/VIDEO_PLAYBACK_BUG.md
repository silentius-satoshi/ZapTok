# Video Playback Bug in Hashtag Inline Viewer

**Status**: Open  
**Priority**: Medium  
**Affected Components**: Hashtag page inline video viewer  
**Date Reported**: October 14, 2025  

## Summary

The hashtag page's inline video viewer exhibits video playback issues when navigating between videos. This affects user experience when browsing videos tagged with specific hashtags.

## Affected Files

- `/src/pages/Hashtag.tsx` - Hashtag page component with inline video viewer
- `/src/hooks/useHashtagVideos.ts` - Hook for fetching videos by hashtag

## Description

When users browse videos on the hashtag page and open the inline video viewer, there are playback issues that prevent smooth video viewing experience. The exact nature of the bug needs further investigation.

## Current Behavior

- Users can navigate to hashtag pages (e.g., `/hashtag/nostr`)
- Videos are correctly fetched and displayed in grid layout
- Clicking a video opens the inline viewer
- **Bug occurs**: Video playback issues in the inline viewer

## Expected Behavior

- Users should be able to click any video in the hashtag grid
- Inline viewer should open with the selected video
- Video should play smoothly without issues
- Navigation between videos should maintain playback quality

## Reproduction Steps

1. Navigate to a hashtag page (e.g., `/hashtag/nostr`)
2. Click on any video in the grid
3. Observe video playback in the inline viewer
4. Try navigating to next/previous videos
5. Notice playback issues

## Technical Context

### Hashtag Page Implementation

The hashtag page uses:
- **Video Grid**: Displays videos tagged with specific hashtag
- **Inline Viewer**: Modal-style viewer with snap scrolling
- **Video Navigation**: Next/Previous buttons for browsing

### Current Video Viewer Code

```tsx
// From src/pages/Hashtag.tsx
const handleVideoClick = (index: number) => {
  setCurrentVideoIndex(index);
  setShowVideoViewer(true);
};

const handleNextVideo = () => {
  if (videos && currentVideoIndex < videos.length - 1) {
    setCurrentVideoIndex(currentVideoIndex + 1);
  }
};
```

### Video Query Implementation

```typescript
// From src/hooks/useHashtagVideos.ts
const events = await queryDiscovery([
  {
    kinds: [21, 22], // NIP-71 video events
    '#t': [tag.toLowerCase()],
    limit: 50,
  },
], { signal: combinedSignal });
```

## Possible Causes

### 1. Video Element State Management
- Video element may not properly reset when switching between videos
- State transitions might not trigger proper video loading

### 2. URL Loading Issues
- Video URLs might not be correctly extracted from event tags
- MIME type detection could be failing

### 3. Component Lifecycle
- Video element might not unmount/remount properly
- React state updates might not trigger video reload

### 4. Event Validation
- `validateVideoEvent` might be filtering out necessary video metadata
- Required tags might be missing from some events

## Investigation Steps

1. **Check Video URL Extraction**
   - Verify video URLs are correctly extracted from NIP-71 events
   - Check if `url` tag is present and valid
   - Validate MIME types are being detected

2. **Inspect Component State**
   - Add console logs to track video index changes
   - Monitor video element lifecycle (mount/unmount)
   - Check if video URLs are updating correctly

3. **Test Video Element Behavior**
   - Verify video element's `src` attribute updates
   - Check if `load()` is called after src changes
   - Monitor video events (canplay, error, loadstart)

4. **Compare with Working Implementations**
   - Review Discover page inline viewer (works correctly)
   - Check differences in video loading logic
   - Identify what makes Discover viewer successful

## Potential Solutions

### Solution 1: Force Video Element Reload
```tsx
// Add key prop to force remount
<video 
  key={currentVideoIndex}
  src={videos[currentVideoIndex].videoUrl}
  // ... other props
/>
```

### Solution 2: Use useEffect for Video Loading
```tsx
useEffect(() => {
  const videoElement = videoRef.current;
  if (videoElement && videos?.[currentVideoIndex]) {
    videoElement.src = videos[currentVideoIndex].videoUrl;
    videoElement.load();
    videoElement.play().catch(console.error);
  }
}, [currentVideoIndex, videos]);
```

### Solution 3: Adopt Discover Page Pattern
- Review the working inline viewer from Discover page
- Apply the same video loading pattern to Hashtag page
- Ensure consistent behavior across viewers

## Workaround

Until fixed, users can:
- View videos in the grid layout without opening inline viewer
- Use browser's native video controls
- Navigate to individual video pages (if available)

## Related Components

- `/src/pages/Discover.tsx` - Working inline video viewer implementation
- `/src/components/VideoCard.tsx` - Video card component
- `/src/components/VideoGrid.tsx` - Grid layout component
- `/src/lib/validateVideoEvent.ts` - Video event validation logic

## Testing Checklist

- [ ] Test with various video formats (mp4, webm, etc.)
- [ ] Test navigation between videos (next/previous)
- [ ] Test on mobile and desktop browsers
- [ ] Test with slow network connections
- [ ] Compare behavior with Discover page viewer
- [ ] Verify video metadata extraction from events

## Notes

- Feature was committed on October 14, 2025 with known issue
- Hashtag discovery functionality works correctly
- Only the inline video playback is affected
- Grid layout and video fetching work as expected

## Next Steps

1. **Debug**: Add logging to track video loading lifecycle
2. **Compare**: Analyze differences between Hashtag and Discover viewers
3. **Fix**: Implement solution based on working pattern
4. **Test**: Verify fix across different browsers and devices
5. **Document**: Update this issue with findings and solution

---

**Last Updated**: October 14, 2025  
**Assigned To**: Pending investigation  
**Related Issues**: None
