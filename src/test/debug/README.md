# Video Debug Tools

This directory contains browser console debugging scripts for diagnosing video preview issues in the ZapTok application.

## Debug Scripts

### `debug-video-events.js`
**Purpose**: Analyze video cards and events on profile pages
**Usage**: Run in browser console on a profile page with video previews
**Analyzes**: 
- Video element sources and states
- "Video not available" error messages
- React component props and event data
- Video URLs found in page content

### `debug-imeta-parsing.js`
**Purpose**: Runtime inspection of imeta tag parsing in React components
**Usage**: Run in browser console on pages with video content
**Analyzes**:
- React Fiber data for VideoCard components
- Imeta tag structure and parsing results
- Event metadata extraction
- Network request debugging guidance

### `debug-raw-events.js`
**Purpose**: Check raw Nostr event data from relay
**Usage**: Run in browser console (requires nostr instance access)
**Analyzes**:
- Raw event tags from Nostr relay
- Imeta tag format validation
- Event structure verification
- Malformed tag detection

### `debug-hybrid-event.js`
**Purpose**: Test hybrid event creation process
**Usage**: Run in browser console to simulate event creation
**Tests**:
- Video tag extraction and processing
- Imeta tag creation logic
- URL encoding and parsing roundtrip
- Event creation consistency

### `debug-imeta-parsing-test.js`
**Purpose**: Test imeta tag parsing logic in isolation
**Usage**: Run in browser console for quick validation
**Tests**:
- Correct vs malformed imeta tag formats
- URL extraction accuracy
- Encoding issue detection
- Parse result validation

## Common Usage Pattern

1. **Profile Page Issues**: Start with `debug-video-events.js`
2. **URL Problems**: Use `debug-imeta-parsing.js` for component inspection
3. **Event Structure**: Run `debug-raw-events.js` to check relay data
4. **Creation Issues**: Test with `debug-hybrid-event.js`
5. **Parsing Validation**: Quick check with `debug-imeta-parsing-test.js`

## Expected Output

These scripts provide detailed console logging to help identify:
- Missing or malformed video URLs
- Imeta tag parsing errors
- CORS issues with video servers
- React component state problems
- Network request failures

All scripts include emoji indicators and structured output for easy debugging.
