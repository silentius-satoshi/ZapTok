# ZapTok Video Features - Manual Testing Guide

This guide provides comprehensive manual testing procedures for ZapTok's video functionality across different browsers and devices.

## 🎯 Testing Strategy Overview

### Critical Areas to Test
1. **Video Playback Compatibility** - Across browsers and devices
2. **Upload/Publishing Flow** - End-to-end user experience  
3. **Cross-Device Video Compatibility** - Mobile, desktop, different screen sizes
4. **Network Resilience** - Slow connections, network failures
5. **User Experience** - Accessibility, responsive design

---

## 📱 Device & Browser Testing Matrix

### Desktop Browsers
- **Chrome** (Latest + 2 previous versions)
- **Firefox** (Latest + 2 previous versions)  
- **Safari** (Latest on macOS)
- **Edge** (Latest)

### Mobile Devices
- **iOS Safari** (iPhone 12+, iPad)
- **Android Chrome** (Pixel, Samsung Galaxy)
- **Mobile Firefox** (Android)

### Screen Resolutions to Test
- **Mobile**: 375×667 (iPhone SE), 390×844 (iPhone 14)
- **Tablet**: 768×1024 (iPad), 810×1080 (Android tablet)
- **Desktop**: 1366×768 (laptop), 1920×1080 (desktop), 2560×1440 (high-DPI)

---

## 🎬 Video Playback Testing

### Test Video Formats
Create test videos in these formats for comprehensive testing:

```bash
# Test video specifications
- MP4 (H.264/AAC): 1080×1920 (vertical), 30s duration
- WebM (VP9/Opus): 1920×1080 (horizontal), 2min duration  
- MOV (H.264/AAC): 1080×1080 (square), 45s duration
- Large file: 95MB MP4 (near size limit)
- Small file: 5MB WebM (quick load test)
```

### Playback Test Scenarios

#### ✅ **Basic Playback**
1. **Load Video Feed**
   - [ ] Videos load without errors
   - [ ] Thumbnails display correctly
   - [ ] Play buttons are responsive
   - [ ] Video starts playing when tapped/clicked

2. **Video Controls**
   - [ ] Play/pause toggle works
   - [ ] Mute/unmute toggle works
   - [ ] Seek/scrub functionality works
   - [ ] Full-screen mode works (desktop)

3. **Auto-play Behavior**
   - [ ] Videos auto-play when scrolled into view
   - [ ] Videos pause when scrolled out of view
   - [ ] Muted by default (browser policy compliance)

#### ✅ **Scroll Performance**
1. **Feed Scrolling**
   - [ ] Smooth scroll between videos
   - [ ] Videos snap to center properly
   - [ ] No frame drops during scroll
   - [ ] Memory usage stays reasonable

2. **Infinite Loading**
   - [ ] New videos load as user scrolls
   - [ ] Loading indicators show appropriately
   - [ ] No duplicate videos appear
   - [ ] Performance doesn't degrade over time

#### ✅ **Network Resilience**
1. **Slow Connections**
   - [ ] Videos buffer appropriately on 3G
   - [ ] Quality adapts to connection speed
   - [ ] Graceful degradation on poor connections
   - [ ] Loading states are clear to users

2. **Network Failures**
   - [ ] Fallback URLs work when primary fails
   - [ ] Error messages are helpful
   - [ ] Retry functionality works
   - [ ] App remains usable during network issues

### Video Quality Testing

#### ✅ **Visual Quality**
- [ ] **1080p videos**: Sharp, no artifacts
- [ ] **Vertical videos**: Fill screen properly on mobile
- [ ] **Horizontal videos**: Display correctly on desktop  
- [ ] **HDR content**: Proper color reproduction (where supported)

#### ✅ **Audio Quality**
- [ ] **Stereo audio**: Both channels work
- [ ] **Volume levels**: Consistent across videos
- [ ] **Audio sync**: No lip-sync issues
- [ ] **Background audio**: Stops when video pauses

---

## 📤 Upload/Publishing Flow Testing

### Pre-Upload Testing

#### ✅ **File Selection**
1. **Drag & Drop**
   - [ ] Drag video file onto upload area
   - [ ] Visual feedback during drag
   - [ ] Accepts valid video files
   - [ ] Rejects invalid file types

2. **File Browser**
   - [ ] Click to open file browser
   - [ ] File type filtering works (video/*)
   - [ ] Multiple selection disabled (single video)
   - [ ] File selection updates UI immediately

3. **File Validation**
   - [ ] **Size limit**: Rejects files > 100MB
   - [ ] **Format check**: Accepts MP4, WebM, MOV, AVI
   - [ ] **Error messages**: Clear and actionable
   - [ ] **Recovery**: Can select different file after error

#### ✅ **Video Preview**
1. **Preview Generation**
   - [ ] Video preview loads within 3 seconds
   - [ ] Maintains aspect ratio
   - [ ] Shows first frame or generated thumbnail
   - [ ] Preview is responsive (fits container)

2. **Metadata Extraction**
   - [ ] Duration extracted correctly
   - [ ] File size displayed accurately  
   - [ ] Resolution/dimensions shown
   - [ ] Video format detected

### Upload Process Testing

#### ✅ **Metadata Form**
1. **Required Fields**
   - [ ] Title field is required
   - [ ] Upload button disabled until title entered
   - [ ] Title character limit enforced (100 chars)
   - [ ] Form validation messages clear

2. **Optional Fields**
   - [ ] Description field works (500 char limit)
   - [ ] Hashtags can be added
   - [ ] All fields preserve data during process

3. **User Experience**
   - [ ] Form is accessible (proper labels)
   - [ ] Tab navigation works
   - [ ] Mobile keyboard appropriate for each field

#### ✅ **Upload Progress**
1. **Progress Indicators**
   - [ ] Progress bar updates smoothly
   - [ ] Percentage displays accurately
   - [ ] Different stages clearly indicated:
     - [ ] Compression (if needed)
     - [ ] Thumbnail generation
     - [ ] Video upload to Blossom
     - [ ] Nostr event publishing

2. **Upload Resilience**
   - [ ] **Server failover**: Tries multiple Blossom servers
   - [ ] **Retry logic**: Automatically retries failed uploads
   - [ ] **Cancellation**: User can cancel mid-upload
   - [ ] **Recovery**: Can resume interrupted uploads

3. **Error Handling**
   - [ ] **Network errors**: Clear error messages
   - [ ] **Server errors**: Helpful troubleshooting info
   - [ ] **Authentication errors**: Prompts for login
   - [ ] **Quota errors**: Explains storage limits

### Post-Upload Testing

#### ✅ **Event Publishing**
1. **Nostr Event Creation**
   - [ ] Hybrid event created (kind 1 for compatibility)
   - [ ] All metadata tags included correctly
   - [ ] Video URL and hash populated
   - [ ] Event publishes to relays successfully

2. **Cross-Client Compatibility**
   - [ ] Video appears in other Nostr clients (Damus, Primal)
   - [ ] Metadata displays correctly elsewhere
   - [ ] Video playback works in other clients
   - [ ] ZapTok-specific features degrade gracefully

#### ✅ **Upload Completion**
1. **Success States**
   - [ ] Success message displays
   - [ ] Upload summary shows key info
   - [ ] Option to share or view video
   - [ ] Form resets for next upload

2. **Content Verification**
   - [ ] Uploaded video appears in user's profile
   - [ ] Video plays correctly after upload
   - [ ] Metadata matches what was entered
   - [ ] Thumbnail generated correctly

---

## 📱 Cross-Device Compatibility Testing

### Mobile-Specific Testing

#### ✅ **iOS Testing**
1. **Safari on iPhone**
   - [ ] Video playback works in all orientations
   - [ ] Gestures work (tap to play, pinch to zoom)
   - [ ] Share functionality works
   - [ ] No memory leaks during extended use

2. **PWA Behavior** (if installed)
   - [ ] Videos work in PWA mode
   - [ ] Upload works without browser chrome
   - [ ] Notifications work (if implemented)
   - [ ] Offline behavior graceful

#### ✅ **Android Testing**
1. **Chrome on Android**
   - [ ] Video controls accessible
   - [ ] Upload flow works with mobile file picker
   - [ ] Camera/gallery integration works
   - [ ] Performance acceptable on mid-range devices

2. **Different Manufacturers**
   - [ ] Samsung Internet browser compatibility
   - [ ] Works on various Android versions (10+)
   - [ ] Handles different screen densities
   - [ ] No manufacturer-specific issues

#### ✅ **Tablet Testing**
1. **iPad**
   - [ ] Utilizes larger screen effectively
   - [ ] Touch targets appropriate size
   - [ ] Landscape mode works well
   - [ ] Split-screen multitasking compatible

2. **Android Tablets**
   - [ ] Responsive design scales properly
   - [ ] Navigation accessible with touch
   - [ ] No UI elements cut off
   - [ ] Performance smooth on lower-end tablets

### Desktop-Specific Testing

#### ✅ **Mouse & Keyboard**
1. **Navigation**
   - [ ] Keyboard shortcuts work (space for play/pause)
   - [ ] Tab navigation logical and complete
   - [ ] Mouse hover states provide feedback
   - [ ] Right-click menus appropriate

2. **Multi-window**
   - [ ] Videos pause when window loses focus
   - [ ] Works correctly in multiple browser tabs
   - [ ] No conflicts with browser extensions
   - [ ] Handles monitor resolution changes

---

## 🔍 Performance Testing

### Load Testing
#### ✅ **Large Video Feeds**
- [ ] Test with 100+ videos in feed
- [ ] Memory usage stays under 500MB
- [ ] Scroll performance remains smooth
- [ ] Video thumbnails load efficiently

#### ✅ **Concurrent Uploads**
- [ ] Multiple users uploading simultaneously
- [ ] Server doesn't become overwhelmed
- [ ] Upload queuing works correctly
- [ ] Error handling under load

### Stress Testing
#### ✅ **Resource Limits**
- [ ] Very long videos (near duration limits)
- [ ] Maximum file size uploads (95MB)
- [ ] Rapid repeated uploads
- [ ] Extended app usage (2+ hours)

---

## ♿ Accessibility Testing

### Screen Readers
#### ✅ **NVDA/JAWS/VoiceOver**
- [ ] Video content announced correctly
- [ ] Upload form fields properly labeled
- [ ] Progress indicators announced
- [ ] Error messages read aloud

### Keyboard Navigation
#### ✅ **Full Keyboard Access**
- [ ] All interactive elements focusable
- [ ] Focus indicators visible and clear
- [ ] Skip links work correctly
- [ ] No keyboard traps

### Visual Accessibility
#### ✅ **Color & Contrast**
- [ ] Sufficient color contrast (4.5:1 minimum)
- [ ] Information not conveyed by color alone
- [ ] High contrast mode support
- [ ] Dark mode works correctly

---

## 🐛 Bug Tracking Template

### Issue Report Format
```markdown
**Browser/Device**: [Chrome 120 on Windows 11]
**Video Format**: [MP4, 1080x1920, 45s, 25MB]
**Steps to Reproduce**:
1. [Detailed steps]
2. [With specific actions]
3. [Clear sequence]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Screenshot/Video**: [If applicable]
**Frequency**: [Always/Sometimes/Rare]
**Impact**: [Critical/High/Medium/Low]
```

### Priority Levels
- **🔴 Critical**: Prevents core functionality (video won't play, upload fails)
- **🟡 High**: Significant UX issues (poor performance, confusing UI)
- **🟢 Medium**: Minor issues (cosmetic problems, edge cases)
- **🔵 Low**: Enhancement opportunities (nice-to-have features)

---

## ✅ Testing Checklists

### Daily Smoke Test (10 minutes)
- [ ] Load video feed on mobile & desktop
- [ ] Play 3 videos successfully
- [ ] Upload 1 test video successfully
- [ ] Check video appears in feed

### Weekly Comprehensive Test (2 hours)
- [ ] Cross-browser video playback (all supported browsers)
- [ ] Complete upload flow testing
- [ ] Mobile device testing
- [ ] Performance monitoring
- [ ] Accessibility spot checks

### Release Testing (4 hours)
- [ ] Full browser matrix testing
- [ ] Multiple device types
- [ ] Network condition simulation
- [ ] Load testing with realistic data
- [ ] Cross-client compatibility verification

---

## 📊 Success Metrics

### Performance Targets
- **Video load time**: < 3 seconds on 4G
- **Upload success rate**: > 95%
- **Cross-browser compatibility**: 100% for core features
- **Mobile responsiveness**: Works on screens 320px+
- **Accessibility**: WCAG 2.1 AA compliance

### User Experience Goals
- **Intuitive upload**: New users complete upload without help
- **Smooth playback**: No buffering on good connections
- **Error recovery**: Users can resolve issues independently
- **Cross-device**: Seamless experience across all devices

This manual testing guide ensures ZapTok's video functionality provides a robust, accessible, and high-quality experience across all supported platforms and devices.