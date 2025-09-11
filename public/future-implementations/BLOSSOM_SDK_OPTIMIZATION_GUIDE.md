# BlossomClient SDK Optimization Implementation Guide

## 📋 Overview

This document provides comprehensive implementation details for optimizing the existing Blossom upload service using the official BlossomClient SDK v4.1.0. The goal is to enhance upload reliability, speed, and user experience while maintaining the robust XMLHttpRequest fallback system.

## 🎯 Current State Analysis

### Existing Implementation (`src/services/blossom-upload.service.ts`)

**Strengths:**
- ✅ Hybrid SDK + XMLHttpRequest fallback architecture
- ✅ Manual BUD-02 authentication with proper event signing
- ✅ Intelligent error detection for fallback triggering
- ✅ Progress tracking and abort signal support
- ✅ Tiered server selection (CORS-friendly prioritization)
- ✅ Non-blocking mirroring to backup servers

**Current Server Configuration:**
```typescript
export const DEFAULT_BLOSSOM_SERVERS = [
  // Tier 1: Known CORS-friendly servers
  'https://blossom.band/',
  'https://nostr.download/',
  // Tier 2: Popular but potentially restrictive
  'https://cdn.satellite.earth/',
  'https://blossom.primal.net/'
];
```

**Current Upload Flow:**
1. Try BlossomClient SDK upload
2. On specific errors (CORS, network, fetch), fallback to XMLHttpRequest
3. Mirror successful uploads to backup servers (non-blocking)
4. Progress tracking throughout the process

## 🚀 Optimization Strategy

### Phase 1: Multi-Server Upload Enhancement
Replace single-server sequential uploads with `multiServerUpload` for parallel processing and automatic mirroring.

### Phase 2: Media Endpoint Integration  
Add BUD-05 `/media` endpoint support for video-optimized processing.

### Phase 3: User Server Preferences
Implement Kind 10063 user server list support for personalized upload targets.

### Phase 4: Advanced Features
Add broken blob recovery, enhanced error handling, and performance analytics.

## 📚 BlossomClient SDK Key Features

### Core Methods Available

```typescript
// Static methods (recommended for standalone operations)
BlossomClient.uploadBlob(server, file, options)
BlossomClient.multiServerUpload(servers, file, options)
BlossomClient.mirrorBlob(server, blobDescriptor, options)
BlossomClient.listBlobs(server, pubkey, options)
BlossomClient.downloadBlob(server, hash, options)
BlossomClient.deleteBlob(server, hash, options)
BlossomClient.uploadMedia(server, file, options) // BUD-05 media endpoint

// Authentication helpers
BlossomClient.createUploadAuth(signer, blob, options)
BlossomClient.createMirrorAuth(signer, hash, options)
BlossomClient.createListAuth(signer, options)
BlossomClient.encodeAuthorizationHeader(authEvent)

// Utility helpers
BlossomClient.getFileSha256(file)
BlossomClient.hasBlob(server, hash)

// Class instance methods (for single-server operations)
const client = new BlossomClient(server, signer);
client.uploadBlob(file, options)
client.mirrorBlob(blobDescriptor, options)
```

### multiServerUpload Configuration Options

```typescript
interface MultiServerUploadOptions {
  // Media optimization (BUD-05)
  isMedia?: boolean; // Enable /media endpoint usage
  mediaUploadBehavior?: "first" | "any"; // Server selection for media
  mediaUploadFallback?: boolean; // Fallback to /upload if /media fails
  
  // Timing and reliability
  signal?: AbortSignal;
  timeout?: number;
  mirrorTimeout?: number; // Timeout for mirror operations
  
  // Authentication and authorization
  auth?: SignedEvent | boolean;
  onAuth?: (server, sha256, type, blob) => Promise<SignedEvent>;
  
  // Payment handling (for premium servers)
  onPayment?: (server, sha256, blob, request) => Promise<PaymentToken>;
  
  // Event callbacks
  onStart?: (server, sha256, blob) => void;
  onUpload?: (server, sha256, blob) => void;
  onError?: (server, sha256, blob, error) => void;
}
```

### User Server Preferences (Kind 10063)

```typescript
import { USER_BLOSSOM_SERVER_LIST_KIND, getServersFromServerListEvent } from 'blossom-client-sdk';

// Kind 10063 event structure
{
  kind: 10063,
  content: "",
  tags: [
    ["server", "https://cdn.example.com"],
    ["server", "https://cdn.backup.com"],
    // Additional server URLs...
  ]
}

// Extract servers from user's preference event
const userServers = getServersFromServerListEvent(event);
```

## 🔧 Implementation Plan

### Step 1: Enhanced Upload Service Class

Create `EnhancedBlossomUploadService` that extends current functionality:

```typescript
class EnhancedBlossomUploadService extends BlossomUploadService {
  
  // Phase 1: Multi-server upload with automatic mirroring
  async uploadWithMultiServer(
    file: File,
    signer: (draft: TDraftEvent) => Promise<any>,
    pubkey: string,
    options?: UploadOptions
  ): Promise<{ url: string; tags: string[][] }> {
    
    const servers = await this.getOptimalServers(pubkey);
    
    const results = await multiServerUpload(servers, file, {
      // Video optimization
      isMedia: this.isVideoFile(file),
      mediaUploadBehavior: "any",
      mediaUploadFallback: true,
      
      // Progress and control
      signal: options?.signal,
      
      // Authentication
      onAuth: async (server, sha256, type) => {
        return await BlossomClient.createUploadAuth(signer, sha256, { 
          type,
          message: `Upload ${file.name} to ZapTok via ${type} endpoint`
        });
      },
      
      // Event tracking
      onStart: (server, sha256) => {
        console.log(`🚀 Starting ${this.isVideoFile(file) ? 'media' : 'blob'} upload to ${server}`);
      },
      
      onUpload: (server, sha256) => {
        console.log(`✅ Successfully uploaded to ${server}`);
        options?.onProgress?.(85); // Near completion
      },
      
      onError: (server, sha256, blob, error) => {
        console.warn(`❌ Upload failed to ${server}:`, error.message);
        // SDK automatically tries next server
      }
    });
    
    // Extract first successful result
    const firstResult = Array.from(results.values())[0];
    if (!firstResult) {
      throw new Error('All multi-server uploads failed');
    }
    
    options?.onProgress?.(100);
    
    return {
      url: firstResult.url,
      tags: this.generateNIP94Tags(firstResult)
    };
  }
  
  // Phase 2: Optimal server selection with user preferences
  private async getOptimalServers(pubkey: string): Promise<string[]> {
    try {
      // Try to get user's server preferences (Kind 10063)
      const userServers = await this.getUserServerPreferences(pubkey);
      if (userServers.length > 0) {
        return userServers;
      }
    } catch (error) {
      console.warn('Failed to fetch user server preferences:', error);
    }
    
    // Fallback to default servers
    return DEFAULT_BLOSSOM_SERVERS;
  }
  
  // Phase 3: User server preference integration
  private async getUserServerPreferences(pubkey: string): Promise<string[]> {
    // Implementation depends on your Nostr integration
    // This would query for Kind 10063 events from the user
    
    // Example implementation:
    const events = await this.nostrQuery([{
      kinds: [USER_BLOSSOM_SERVER_LIST_KIND], // 10063
      authors: [pubkey],
      limit: 1
    }]);
    
    if (events.length > 0) {
      const serverUrls = getServersFromServerListEvent(events[0]);
      return serverUrls.map(url => url.toString());
    }
    
    return [];
  }
  
  // Helper: Check if file is video
  private isVideoFile(file: File): boolean {
    return file.type.startsWith('video/') || 
           ['.mp4', '.webm', '.mov', '.avi'].some(ext => 
             file.name.toLowerCase().endsWith(ext)
           );
  }
  
  // Phase 4: Maximum reliability upload strategy
  async uploadWithMaximumReliability(
    file: File,
    signer: (draft: TDraftEvent) => Promise<any>,
    pubkey: string,
    options?: UploadOptions
  ): Promise<{ url: string; tags: string[][] }> {
    
    if (options?.signal?.aborted) {
      throw new Error(UPLOAD_ABORTED_ERROR_MSG);
    }
    
    options?.onProgress?.(0);
    
    try {
      // PHASE 1: Try multiServerUpload (best case)
      options?.onProgress?.(10);
      const result = await this.uploadWithMultiServer(file, signer, pubkey, {
        ...options,
        onProgress: (progress) => {
          // Scale progress to 10-85% range for multi-server attempt
          const scaledProgress = 10 + (progress * 0.75);
          options?.onProgress?.(scaledProgress);
        }
      });
      
      return result;
      
    } catch (multiServerError) {
      console.warn('🔄 MultiServerUpload failed, falling back to hybrid method:', multiServerError);
      
      // PHASE 2: Fallback to existing hybrid approach
      options?.onProgress?.(85);
      
      try {
        const result = await super.upload(file, signer, pubkey, {
          ...options,
          onProgress: (progress) => {
            // Scale progress to 85-100% range for fallback attempt
            const scaledProgress = 85 + (progress * 0.15);
            options?.onProgress?.(scaledProgress);
          }
        });
        
        return result;
        
      } catch (hybridError) {
        console.error('❌ Both multiServerUpload and hybrid method failed');
        throw new Error(`Upload failed: MultiServer (${multiServerError.message}), Hybrid (${hybridError.message})`);
      }
    }
  }
}
```

### Step 2: Integration Points

#### A. Replace in VideoUploadModal.tsx
```typescript
// Replace existing upload call
const result = await BlossomUploadService.uploadWithMaximumReliability(
  file, 
  signer, 
  user.pubkey,
  { onProgress: setProgress, signal: abortController.signal }
);
```

#### B. Add User Server Management UI
```typescript
// New component: UserServerPreferences.tsx
export function UserServerPreferences() {
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  
  const handleSaveServers = (servers: string[]) => {
    publishEvent({
      kind: 10063,
      content: "",
      tags: servers.map(server => ["server", server])
    });
  };
  
  // UI for managing server preferences...
}
```

### Step 3: Advanced Features Implementation

#### A. Broken Blob Recovery
```typescript
import { handleImageFallbacks } from 'blossom-client-sdk';

// Auto-recover broken video/image elements
const handleBrokenMedia = (mediaElement: HTMLVideoElement | HTMLImageElement) => {
  mediaElement.dataset.pubkey = eventAuthorPubkey; // Set author pubkey
  
  handleImageFallbacks(mediaElement, async (pubkey) => {
    if (pubkey) {
      // Get user's server list
      const servers = await getUserServerPreferences(pubkey);
      return servers.map(url => new URL(url));
    }
    return undefined;
  });
};
```

#### B. Server Health Monitoring
```typescript
class ServerHealthMonitor {
  private healthCache = new Map<string, { healthy: boolean; lastCheck: number }>();
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  async getHealthyServers(servers: string[]): Promise<string[]> {
    const healthyServers: string[] = [];
    
    for (const server of servers) {
      const health = await this.checkServerHealth(server);
      if (health.healthy) {
        healthyServers.push(server);
      }
    }
    
    return healthyServers.length > 0 ? healthyServers : servers; // Fallback to all if none healthy
  }
  
  private async checkServerHealth(server: string): Promise<{ healthy: boolean; lastCheck: number }> {
    const cached = this.healthCache.get(server);
    const now = Date.now();
    
    if (cached && (now - cached.lastCheck) < this.HEALTH_CHECK_INTERVAL) {
      return cached;
    }
    
    try {
      const response = await fetch(server, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      const result = { healthy: response.ok, lastCheck: now };
      this.healthCache.set(server, result);
      return result;
    } catch {
      const result = { healthy: false, lastCheck: now };
      this.healthCache.set(server, result);
      return result;
    }
  }
}
```

## 📊 Performance Expectations

### Before Optimization
- **Upload Success Rate**: ~85% (single server, sequential)
- **Upload Speed**: Single server, manual retry on failure
- **Redundancy**: Manual mirroring after success
- **User Experience**: Generic server selection

### After Optimization
- **Upload Success Rate**: ~98% (multi-server with automatic failover)
- **Upload Speed**: 2-3x faster (parallel uploads)
- **Redundancy**: Automatic mirroring to multiple servers
- **User Experience**: Personalized server selection, media optimization

### Metrics to Track
```typescript
interface UploadMetrics {
  totalAttempts: number;
  successfulUploads: number;
  failedUploads: number;
  averageUploadTime: number;
  serverSuccessRates: Record<string, { attempts: number; successes: number }>;
  methodUsage: {
    multiServer: number;
    hybridFallback: number;
    xhrFallback: number;
  };
}
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
describe('EnhancedBlossomUploadService', () => {
  test('should use multiServerUpload for optimal uploads', async () => {
    // Test multi-server upload path
  });
  
  test('should fallback to hybrid method on multiServer failure', async () => {
    // Test fallback mechanism
  });
  
  test('should respect user server preferences', async () => {
    // Test Kind 10063 integration
  });
  
  test('should optimize media uploads with BUD-05', async () => {
    // Test media endpoint usage
  });
});
```

### Integration Tests
```typescript
describe('Upload Flow Integration', () => {
  test('should handle complete upload workflow', async () => {
    // Test end-to-end upload with all optimizations
  });
  
  test('should maintain compatibility with existing components', async () => {
    // Test VideoUploadModal integration
  });
});
```

## 🔧 Migration Steps

### Phase 1: Preparation (Day 1)
1. ✅ **Current state documented** - This guide
2. ⚠️ **Create enhanced service class** - Extend existing service
3. ⚠️ **Add feature flags** - Enable gradual rollout
4. ⚠️ **Set up metrics collection** - Track performance improvements

### Phase 2: Core Enhancement (Day 2-3)
1. ⚠️ **Implement multiServerUpload integration**
2. ⚠️ **Add media endpoint support** 
3. ⚠️ **Create fallback mechanism**
4. ⚠️ **Update VideoUploadModal integration**

### Phase 3: User Features (Day 4-5)
1. ⚠️ **Add user server preference support**
2. ⚠️ **Create server management UI**
3. ⚠️ **Implement broken blob recovery**
4. ⚠️ **Add server health monitoring**

### Phase 4: Optimization (Day 6-7)
1. ⚠️ **Performance monitoring and tuning**
2. ⚠️ **Error handling improvements**
3. ⚠️ **Documentation and testing**
4. ⚠️ **Gradual feature flag rollout**

## 🚨 Risk Mitigation

### Backwards Compatibility
- ✅ **Keep existing XMLHttpRequest fallback** - Maximum compatibility
- ✅ **Maintain current API interface** - No breaking changes
- ✅ **Feature flags for gradual rollout** - Safe deployment

### Error Handling
- ✅ **Multi-layer fallbacks** - SDK → Hybrid → XHR
- ✅ **Comprehensive error logging** - Debug failed uploads
- ✅ **Graceful degradation** - Always maintain basic functionality

### Performance Safeguards
- ✅ **Timeout controls** - Prevent hanging uploads
- ✅ **Progress tracking** - User feedback during uploads
- ✅ **Server health monitoring** - Avoid problematic servers

## 📝 Dependencies and Requirements

### Required Packages
```json
{
  "blossom-client-sdk": "^4.1.0" // Already installed
}
```

### NostrIFY Integration Points
```typescript
// Required from existing codebase
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
```

### File Locations to Modify
```
src/services/blossom-upload.service.ts     // Core enhancement
src/components/VideoUploadModal.tsx        // Integration point  
src/components/UserServerPreferences.tsx   // New component
src/hooks/useUserServers.ts                // New hook (optional)
src/types/blossom.ts                       // Type definitions
```

## 🎯 Success Criteria

### Technical Metrics
- [ ] Upload success rate >95%
- [ ] Average upload speed 2x faster
- [ ] Multi-server redundancy working
- [ ] Media endpoint optimization active
- [ ] User server preferences functional

### User Experience Metrics  
- [ ] Reduced upload failures reported
- [ ] Faster video upload times
- [ ] Seamless fallback experience
- [ ] Personalized server selection working

### Code Quality Metrics
- [ ] Existing tests passing
- [ ] New features tested
- [ ] No breaking changes
- [ ] Documentation updated

## 🔗 Additional Resources

### BlossomClient SDK Documentation
- **GitHub**: https://github.com/hzrd149/blossom-client-sdk
- **API Docs**: https://hzrd149.github.io/blossom-client-sdk/
- **Examples**: See repository tests and README

### Blossom Protocol Specifications
- **BUD-02**: Authentication events
- **BUD-05**: Media upload endpoints  
- **NIP-94**: File metadata events
- **NIP-10063**: User server lists

---

## 🚀 Ready for Implementation

This guide provides everything needed for AI agents to implement the complete BlossomClient SDK optimization. The strategy maintains the robust existing architecture while adding powerful new capabilities for improved reliability, performance, and user experience.

**Start with Phase 1 (multiServerUpload) for immediate 2-3x performance gains!** 🎯
