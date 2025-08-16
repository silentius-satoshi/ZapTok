# Client-Side Video Compression Implementation Plan

## Executive Summary

This document provides a comprehensive framework for implementing client-side video compression in ZapTok. The goal is to reduce mobile data usage by 20x (from 500MB videos to 25MB) while maintaining quality and user experience.

## Current State Analysis

### ZapTok's Current Video Implementation
- **Upload Limit**: 100MB maximum file size
- **Compression**: None (raw file uploads)
- **Quality Options**: None available to users
- **Mobile Optimization**: Missing `preload="metadata"` attributes
- **Data Usage**: Full file size downloaded on mobile

### Problem Statement
Mobile users with limited data plans (≤5GB/month) cannot reasonably use ZapTok when videos consume 100-500MB each. This creates accessibility barriers and limits platform adoption.

## Reference Architecture

### Multi-Quality Compression Pipeline
```typescript
// Quality tier specifications for optimal compression
const QUALITY_TIERS = {
  ultraLow: {
    targetSize: 10 * 1024 * 1024,     // 10MB
    maxResolution: 480,               // 480p
    maxFrameRate: 24,                 // 24fps
    maxBitrate: 0.8,                  // 800 kbps
    useCase: "Extremely limited data plans"
  },
  low: {
    targetSize: 25 * 1024 * 1024,     // 25MB
    maxResolution: 720,               // 720p
    maxFrameRate: 30,                 // 30fps
    maxBitrate: 1.5,                  // 1.5 Mbps
    useCase: "Standard mobile data"
  },
  medium: {
    targetSize: 50 * 1024 * 1024,     // 50MB
    maxResolution: 1080,              // 1080p
    maxFrameRate: 30,                 // 30fps
    maxBitrate: 3.0,                  // 3 Mbps
    useCase: "WiFi or unlimited data"
  },
  high: {
    targetSize: 90 * 1024 * 1024,     // 90MB
    maxResolution: 1080,              // 1080p+
    maxFrameRate: 60,                 // 60fps
    maxBitrate: 6.0,                  // 6 Mbps
    useCase: "High-speed connections"
  }
};
```

### Progressive Fallback Strategy
```
Original Video (e.g., 200MB)
    ↓
Try High Quality Compression
    ↓ (if still > target size)
Try Medium Quality Compression  
    ↓ (if still > target size)
Try Low Quality Compression
    ↓ (if still > target size)
Try Ultra-Low Quality Compression
    ↓
Final Result: Always under target threshold
```

## Implementation Framework

### Phase 1: Dependencies & Infrastructure (2-3 days)

#### Required Dependencies
```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
npm install --dev @types/offscreencanvas
```

#### Core Files to Create
1. `src/lib/videoCompression.ts` - Main compression engine
2. `src/lib/compressionWorker.ts` - Web Worker for non-blocking compression
3. `src/hooks/useVideoCompression.ts` - React hook for compression state
4. `src/components/CompressionProgress.tsx` - UI component for progress display

#### Web Worker Setup
```typescript
// src/lib/compressionWorker.ts - Template structure
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

class VideoCompressionWorker {
  private ffmpeg: FFmpeg;
  
  async initialize() {
    // Initialize FFmpeg with WebAssembly
  }
  
  async compressVideo(file: File, quality: QualityTier): Promise<Blob> {
    // Implement compression logic
  }
  
  async progressiveCompress(file: File): Promise<Blob> {
    // Implement fallback strategy
  }
}
```

### Phase 2: Core Compression Engine (3-4 days)

#### AI Implementation Instructions

**File: `src/lib/videoCompression.ts`**

Create the main compression engine with these exact specifications:

1. **Quality Detection Function**
   ```typescript
   function detectOptimalQuality(
     fileSize: number, 
     connectionSpeed?: number,
     userPreference?: string
   ): QualityTier
   ```
   - Analyze file size vs target ratios
   - Consider user's connection speed if available
   - Respect user's quality preference from settings
   - Default to 'low' for mobile, 'medium' for desktop

2. **Progressive Compression Function**
   ```typescript
   async function compressVideoProgressive(
     file: File,
     onProgress: (progress: number, currentQuality: string) => void
   ): Promise<{ blob: Blob; quality: string; originalSize: number; compressedSize: number }>
   ```
   - Implement exactly 4 quality attempts (high → medium → low → ultraLow)
   - Each attempt should target specific file size from QUALITY_TIERS
   - Call onProgress callback with percentage and current quality being attempted
   - Return first successful compression that meets size target
   - Include compression ratio statistics for user feedback

3. **Video Analysis Function**
   ```typescript
   async function analyzeVideo(file: File): Promise<{
     duration: number;
     width: number;
     height: number;
     frameRate: number;
     estimatedComplexity: 'low' | 'medium' | 'high';
   }>
   ```
   - Extract video metadata without full processing
   - Estimate compression complexity based on resolution, frame rate, duration
   - Use for intelligent quality pre-selection

#### FFmpeg Command Generation
Create helper functions that generate FFmpeg commands for each quality tier:

```typescript
function generateFFmpegCommand(
  inputFile: string,
  outputFile: string,
  specs: QualityTierSpecs
): string[] {
  return [
    '-i', inputFile,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', calculateCRF(specs),
    '-maxrate', `${specs.maxBitrate}M`,
    '-bufsize', `${specs.maxBitrate * 2}M`,
    '-vf', `scale=${specs.maxResolution}:-2`,
    '-r', specs.maxFrameRate.toString(),
    '-c:a', 'aac',
    '-b:a', '128k',
    outputFile
  ];
}
```

### Phase 3: ZapTok Integration (3-4 days)

#### Modify Existing Components

**File: `src/components/VideoUploadModal.tsx`**

AI Instructions for modification:

1. **Add Compression State Management**
   ```typescript
   const [compressionState, setCompressionState] = useState<{
     isCompressing: boolean;
     progress: number;
     currentQuality: string;
     originalSize: number;
     compressedSize: number;
     error?: string;
   }>({
     isCompressing: false,
     progress: 0,
     currentQuality: '',
     originalSize: 0,
     compressedSize: 0
   });
   ```

2. **Replace File Upload Logic**
   - Before calling `useUploadFile`, compress the video
   - Show compression progress UI during processing
   - Display compression statistics (original vs compressed size)
   - Allow user to cancel compression and try different quality

3. **Add Quality Selection UI**
   ```tsx
   <QualitySelector 
     onQualityChange={setSelectedQuality}
     defaultQuality={detectOptimalQuality(file.size)}
     showDataUsageEstimate={true}
   />
   ```

**File: `src/components/VideoCard.tsx`**

AI Instructions for immediate mobile optimization:

1. **Add Data-Saving Attributes**
   ```tsx
   <video
     preload="metadata"  // Only load metadata, not full video
     playsInline
     controls
     // ... existing props
   >
   ```

2. **Implement Quality Selection UI**
   ```tsx
   {/* Add quality selector overlay */}
   <QualitySelector 
     availableQualities={videoQualities}
     currentQuality={selectedQuality}
     onQualityChange={handleQualityChange}
     showDataUsage={true}
   />
   ```

#### New Components to Create

**File: `src/components/CompressionProgress.tsx`**
```tsx
interface CompressionProgressProps {
  progress: number;
  currentQuality: string;
  originalSize: number;
  estimatedCompressedSize: number;
  onCancel: () => void;
}

export function CompressionProgress({ ... }: CompressionProgressProps) {
  // Implement progress bar with:
  // - Circular progress indicator
  // - Current quality being processed
  // - File size comparison (before/after)
  // - Estimated time remaining
  // - Cancel button
  // - Data savings visualization
}
```

**File: `src/components/QualitySelector.tsx`**
```tsx
interface QualitySelectorProps {
  availableQualities: QualityTier[];
  currentQuality: string;
  onQualityChange: (quality: string) => void;
  showDataUsage?: boolean;
  estimatedSizes?: Record<string, number>;
}

export function QualitySelector({ ... }: QualitySelectorProps) {
  // Implement dropdown/radio group with:
  // - Quality options (Ultra-Low, Low, Medium, High)
  // - File size estimates for each quality
  // - Data usage impact visualization
  // - Recommended quality highlighting
  // - Connection speed detection integration
}
```

### Phase 4: Settings Integration (2-3 days)

#### Data-Saving Settings

**File: `src/components/MediaSettings.tsx`** (create or modify existing)

AI Instructions for settings implementation:

1. **Add Data-Saving Options**
   ```typescript
   interface MediaSettings {
     defaultVideoQuality: QualityTier;
     wifiOnlyMode: boolean;
     autoCompression: boolean;
     maxDataUsagePerVideo: number; // MB
     compressionPreference: 'speed' | 'quality' | 'size';
   }
   ```

2. **Create Settings UI**
   ```tsx
   <SettingsSection title="Video Compression">
     <SettingToggle
       label="WiFi-Only Video Playback"
       description="Only play videos when connected to WiFi"
       value={settings.wifiOnlyMode}
       onChange={updateWifiOnlyMode}
     />
     
     <SettingSelect
       label="Default Video Quality"
       description="Automatic quality selection for uploads"
       options={qualityOptions}
       value={settings.defaultVideoQuality}
       onChange={updateDefaultQuality}
     />
     
     <SettingSlider
       label="Max Data Usage Per Video"
       description="Maximum MB to download per video"
       min={5}
       max={100}
       value={settings.maxDataUsagePerVideo}
       onChange={updateMaxDataUsage}
     />
   </SettingsSection>
   ```

#### Connection Detection

**File: `src/hooks/useConnectionSpeed.ts`**
```typescript
export function useConnectionSpeed() {
  // Implement Navigator.connection API detection
  // Fallback to fetch-based speed testing
  // Return estimated speed category: 'slow' | 'medium' | 'fast'
  // Update compression recommendations based on speed
}
```

### Phase 5: Advanced Features (2-3 days)

#### Intelligent Compression

**File: `src/lib/adaptiveCompression.ts`**

AI Instructions for advanced features:

1. **Scene Complexity Analysis**
   ```typescript
   async function analyzeVideoComplexity(file: File): Promise<{
     sceneChanges: number;
     averageMotion: number;
     colorComplexity: number;
     compressionDifficulty: 'easy' | 'medium' | 'hard';
   }>
   ```

2. **Adaptive Bitrate Selection**
   ```typescript
   function calculateOptimalBitrate(
     complexity: VideoComplexity,
     targetSize: number,
     duration: number
   ): number
   ```

3. **Smart Quality Preselection**
   ```typescript
   function recommendQuality(
     fileSize: number,
     videoAnalysis: VideoComplexity,
     userConnection: ConnectionSpeed,
     userPreferences: UserSettings
   ): QualityTier
   ```

#### Background Processing

**File: `src/lib/compressionQueue.ts`**
```typescript
class CompressionQueue {
  // Implement queue for multiple video compression
  // Background processing with Service Worker
  // Progress persistence across browser sessions
  // Retry logic for failed compressions
}
```

## User Experience Specifications

### Compression Flow UX

1. **Upload Initiation**
   - User selects video file
   - Show immediate file size and estimated compression time
   - Display recommended quality based on file size and connection

2. **Quality Selection**
   - Present 4 quality options with clear data usage estimates
   - Highlight recommended option based on user's connection
   - Show compression time estimates for each quality

3. **Compression Progress**
   - Real-time progress bar with percentage
   - Show current quality being processed
   - Display before/after file sizes
   - Estimated time remaining
   - Option to cancel and try different quality

4. **Completion Feedback**
   - Show final compression statistics
   - Data saved visualization (e.g., "Reduced by 85% - saved 340MB")
   - Option to adjust quality and re-compress if not satisfied

### Error Handling

1. **Compression Failures**
   - Clear error messages for different failure types
   - Automatic fallback to next quality level
   - Option to upload original if all compression fails

2. **Browser Compatibility**
   - Detect WebAssembly support
   - Graceful degradation for unsupported browsers
   - Alternative compression methods or server-side fallback

## Testing Strategy

### Unit Tests Required

1. **Compression Algorithm Tests**
   ```typescript
   // Test file: src/lib/videoCompression.test.ts
   describe('Video Compression', () => {
     test('should compress video to target size', async () => {
       // Test each quality tier hits target file size
     });
     
     test('should maintain aspect ratio', async () => {
       // Verify resolution scaling preserves aspect ratio
     });
     
     test('should handle progressive fallback', async () => {
       // Test cascading quality attempts
     });
   });
   ```

2. **Quality Detection Tests**
   ```typescript
   // Test optimal quality selection logic
   // Test connection speed integration
   // Test user preference handling
   ```

3. **Integration Tests**
   ```typescript
   // Test VideoUploadModal compression integration
   // Test settings persistence
   // Test error handling flows
   ```

### Performance Benchmarks

Create benchmarks for:
- Compression speed per quality tier
- Memory usage during compression
- Browser performance impact
- Battery usage on mobile devices

## Migration Strategy

### Backward Compatibility

1. **Existing Videos**
   - No impact on already uploaded videos
   - New compression only applies to new uploads
   - Option to re-compress existing videos in user settings

2. **Client Compatibility**
   - Compressed videos work with all existing Nostr clients
   - Standard NIP-94 metadata for file information
   - Quality information stored in custom tags

### Rollout Plan

1. **Phase 1**: Deploy compression engine as optional feature
2. **Phase 2**: Enable by default for mobile users
3. **Phase 3**: Make compression mandatory for files >50MB
4. **Phase 4**: Add advanced features (scene analysis, adaptive bitrate)

## Success Metrics

### Technical Metrics
- Average file size reduction: Target 70-85%
- Compression time: <2 minutes for 100MB video
- Error rate: <5% compression failures
- Browser compatibility: 95%+ success rate

### User Experience Metrics
- Mobile data usage reduction: 20x improvement
- User adoption of compression features: >80%
- Compression satisfaction rate: >90%
- Support ticket reduction: 50% fewer upload issues

### Business Impact
- Increased mobile user engagement
- Reduced server storage costs
- Improved platform accessibility
- Enhanced creator retention

## Technical Risks & Mitigation

### Risk 1: Browser Performance Impact
- **Mitigation**: Web Workers for non-blocking compression
- **Fallback**: Server-side compression API

### Risk 2: WebAssembly Compatibility
- **Mitigation**: Feature detection and graceful degradation
- **Fallback**: Native compression libraries where available

### Risk 3: Compression Quality Concerns
- **Mitigation**: Extensive testing with sample videos
- **Fallback**: Always preserve original as backup option

### Risk 4: Development Complexity
- **Mitigation**: Phased implementation with iterative testing
- **Fallback**: Start with simple compression, add sophistication later

## Future Enhancements

### Advanced Features for Later Consideration

1. **AI-Powered Compression**
   - Machine learning for optimal compression settings
   - Content-aware quality selection
   - Automatic scene detection and optimization

2. **Real-Time Streaming Compression**
   - Live video compression for streaming features
   - Adaptive bitrate for real-time playback
   - Integration with future live streaming NIPs

3. **Collaborative Compression**
   - P2P compression assistance
   - Distributed processing for large files
   - Community-contributed compression profiles

## Implementation Checklist

### Prerequisites
- [ ] Research modern video compression best practices
- [ ] Set up development environment with FFmpeg.js
- [ ] Create test video library for compression testing
- [ ] Define success criteria and testing methodology

### Phase 1: Foundation
- [ ] Install required dependencies (@ffmpeg/ffmpeg, @ffmpeg/util)
- [ ] Create basic compression worker structure
- [ ] Implement quality tier definitions
- [ ] Set up Web Worker communication

### Phase 2: Core Engine
- [ ] Implement progressive compression algorithm
- [ ] Create video analysis functions
- [ ] Add FFmpeg command generation
- [ ] Implement error handling and fallbacks

### Phase 3: UI Integration
- [ ] Modify VideoUploadModal for compression
- [ ] Create CompressionProgress component
- [ ] Add QualitySelector component
- [ ] Update VideoCard with preload optimization

### Phase 4: Settings & Polish
- [ ] Add data-saving settings
- [ ] Implement connection speed detection
- [ ] Create user preference management
- [ ] Add compression statistics tracking

### Phase 5: Testing & Optimization
- [ ] Write comprehensive unit tests
- [ ] Perform cross-browser compatibility testing
- [ ] Optimize compression parameters
- [ ] Document implementation for future developers

---

## Conclusion

This implementation will transform ZapTok from a data-heavy video platform to a mobile-friendly, accessible application suitable for users with limited data plans. The 20x reduction in data usage (500MB → 25MB) will significantly expand ZapTok's potential user base while maintaining video quality and user experience.

The phased approach ensures manageable development while providing immediate benefits through simple optimizations like `preload="metadata"`. The comprehensive framework above provides clear AI instructions for implementation when the team is ready to tackle this important feature.

**Estimated Total Development Time**: 2-3 weeks
**Priority Level**: High (Mobile Accessibility)
**Dependencies**: FFmpeg.js, Web Workers, Modern Browser Support
**Impact**: Transformational for mobile user experience
