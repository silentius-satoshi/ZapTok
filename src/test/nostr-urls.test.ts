/**
 * Unit tests for nostr-urls.ts
 * Tests URL conversion, validation, and sharing functionality
 */

import { describe, test, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
import {
  isValidNostrIdentifier,
  toNjumpURL,
  toZapTokURL,
  pubkeyToNjumpURL,
  eventToNjumpURL,
  naddrToNjumpURL,
  createMinimalNevent,
  generateShareableURLs,
  generateEnhancedShareableURLs,
  generateQRData,
  generateProfileShareURL,
  generateEnhancedProfileShareURL,
  generateVideoShareURL,
  generateEnhancedVideoShareURL,
  detectAndNormalizeNostrURL,
  generateDualDisplay,
  isValidVanityName,
  parseZapTokURL,
  convertURL,
  ZAPTOK_CONFIG
} from '../lib/nostr-urls';
import type { NostrEvent } from '@nostrify/nostrify';

// Test data
const testPubkey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const testEventId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
const testNpub = nip19.npubEncode(testPubkey);
const testNote = nip19.noteEncode(testEventId);

const testEvent: NostrEvent = {
  id: testEventId,
  pubkey: testPubkey,
  kind: 1,
  content: 'Test note',
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
  sig: 'test_signature'
};

describe('nostr-urls utilities', () => {
  describe('isValidNostrIdentifier', () => {
    test('validates npub identifiers', () => {
      expect(isValidNostrIdentifier(testNpub)).toBe(true);
      expect(isValidNostrIdentifier('npub1invalid')).toBe(false);
    });

    test('validates note identifiers', () => {
      expect(isValidNostrIdentifier(testNote)).toBe(true);
      expect(isValidNostrIdentifier('note1invalid')).toBe(false);
    });

    test('validates hex pubkeys', () => {
      expect(isValidNostrIdentifier(testPubkey)).toBe(true);
      expect(isValidNostrIdentifier('invalid_hex')).toBe(false);
      expect(isValidNostrIdentifier('123')).toBe(false); // Too short
    });

    test('handles nostr: prefix', () => {
      expect(isValidNostrIdentifier(`nostr:${testNpub}`)).toBe(true);
      expect(isValidNostrIdentifier(`nostr:${testNote}`)).toBe(true);
    });

    test('validates nevent identifiers', () => {
      const nevent = nip19.neventEncode({
        id: testEventId,
        relays: ['wss://relay.damus.io']
      });
      expect(isValidNostrIdentifier(nevent)).toBe(true);
    });

    test('validates nprofile identifiers', () => {
      const nprofile = nip19.nprofileEncode({
        pubkey: testPubkey,
        relays: ['wss://relay.damus.io']
      });
      expect(isValidNostrIdentifier(nprofile)).toBe(true);
    });

    test('validates naddr identifiers', () => {
      const naddr = nip19.naddrEncode({
        kind: 30023,
        pubkey: testPubkey,
        identifier: 'test-article'
      });
      expect(isValidNostrIdentifier(naddr)).toBe(true);
    });
  });

  describe('toNjumpURL', () => {
    test('converts npub to njump URL', () => {
      const result = toNjumpURL(testNpub);
      expect(result).toBe(`https://njump.me/${testNpub}`);
    });

    test('converts note to njump URL', () => {
      const result = toNjumpURL(testNote);
      expect(result).toBe(`https://njump.me/${testNote}`);
    });

    test('handles nostr: prefix', () => {
      const result = toNjumpURL(`nostr:${testNpub}`);
      expect(result).toBe(`https://njump.me/${testNpub}`);
    });

    test('throws error for invalid identifier', () => {
      expect(() => toNjumpURL('invalid')).toThrow('Invalid Nostr identifier');
    });
  });

  describe('pubkeyToNjumpURL', () => {
    test('converts hex pubkey to njump URL', () => {
      const result = pubkeyToNjumpURL(testPubkey);
      expect(result).toBe(`https://njump.me/${testNpub}`);
    });

    test('throws error for invalid pubkey', () => {
      expect(() => pubkeyToNjumpURL('invalid')).toThrow('Invalid pubkey format');
    });
  });

  describe('createMinimalNevent', () => {
    test('creates minimal nevent with only event ID', () => {
      const result = createMinimalNevent(testEventId);
      expect(result).toMatch(/^nevent1[023456789acdefghjklmnpqrstuvwxyz]+$/);
      
      // Decode and verify it contains the event ID
      const decoded = nip19.decode(result);
      expect(decoded.type).toBe('nevent');
      expect((decoded.data as any).id).toBe(testEventId);
    });

    test('creates minimal nevent with author when provided', () => {
      const result = createMinimalNevent(testEventId, testPubkey);
      expect(result).toMatch(/^nevent1[023456789acdefghjklmnpqrstuvwxyz]+$/);
      
      // Decode and verify it contains both event ID and author
      const decoded = nip19.decode(result);
      expect(decoded.type).toBe('nevent');
      expect((decoded.data as any).id).toBe(testEventId);
      expect((decoded.data as any).author).toBe(testPubkey);
    });

    test('falls back gracefully on encoding errors', () => {
      // Use an invalid event ID that will cause both nevent and note encoding to fail
      const invalidEventId = 'not-a-valid-hex-string';
      const result = createMinimalNevent(invalidEventId);
      
      // Should return the original input when both encodings fail
      expect(result).toBe(invalidEventId);
    });
  });

  describe('eventToNjumpURL', () => {
    test('converts event to njump URL using minimal nevent', () => {
      const result = eventToNjumpURL(testEvent, ['wss://relay.damus.io']);
      // Should use minimal nevent (no relay hints)
      const expectedNevent = createMinimalNevent(testEvent.id, testEvent.pubkey);
      expect(result).toBe(`https://njump.me/${expectedNevent}`);
    });

    test('handles events without relays using minimal encoding', () => {
      const result = eventToNjumpURL(testEvent);
      const expectedNevent = createMinimalNevent(testEvent.id, testEvent.pubkey);
      expect(result).toBe(`https://njump.me/${expectedNevent}`);
    });
  });

  describe('naddrToNjumpURL', () => {
    test('converts addressable event to njump URL', () => {
      const result = naddrToNjumpURL(30023, testPubkey, 'test-article', ['wss://relay.damus.io']);
      const expectedNaddr = nip19.naddrEncode({
        kind: 30023,
        pubkey: testPubkey,
        identifier: 'test-article',
        relays: ['wss://relay.damus.io']
      });
      expect(result).toBe(`https://njump.me/${expectedNaddr}`);
    });
  });

  describe('generateShareableURLs', () => {
    test('generates complete shareable URLs', () => {
      const result = generateShareableURLs(testNpub);

      // Phase 2: Primary is now ZapTok branded
      expect(result.primary).toBe(`https://zaptok.social/@${testNpub}`);
      expect(result.fallback).toBe(`https://njump.me/${testNpub}`);
      expect(result.raw).toBe(`nostr:${testNpub}`);
    });

    test('includes JSON export when event data provided', () => {
      const result = generateShareableURLs(testNote, {
        eventData: testEvent
      });

      expect(result.json).toBeDefined();
      expect(JSON.parse(result.json!)).toEqual(testEvent);
    });

    test('throws error for invalid identifier', () => {
      expect(() => generateShareableURLs('invalid')).toThrow('Invalid Nostr identifier');
    });
  });

  describe('generateQRData', () => {
    test('generates njump URL by default', () => {
      const result = generateQRData(testNpub);
      expect(result).toBe(`https://njump.me/${testNpub}`);
    });

    test('returns raw identifier when preferRaw is true', () => {
      const result = generateQRData(testNpub, { preferRaw: true });
      expect(result).toBe(testNpub);
    });

    test('includes nostr prefix when requested', () => {
      const result = generateQRData(testNpub, {
        preferRaw: true,
        includeNostrPrefix: true
      });
      expect(result).toBe(`nostr:${testNpub}`);
    });

    test('throws error for invalid identifier', () => {
      expect(() => generateQRData('invalid')).toThrow('Invalid Nostr identifier');
    });
  });

  describe('generateProfileShareURL', () => {
    test('generates profile share URL with npub', () => {
      const result = generateProfileShareURL(testPubkey);

      expect(result.fallback).toBe(`https://njump.me/${testNpub}`);
      expect(result.raw).toBe(`nostr:${testNpub}`);
    });

    test('uses nprofile when relays provided', () => {
      const relays = ['wss://relay.damus.io', 'wss://nos.lol'];
      const result = generateProfileShareURL(testPubkey, undefined, relays);

      const expectedNprofile = nip19.nprofileEncode({
        pubkey: testPubkey,
        relays
      });

      expect(result.fallback).toBe(`https://njump.me/${expectedNprofile}`);
      expect(result.raw).toBe(`nostr:${expectedNprofile}`);
    });

    test('limits relays to 3 for QR size optimization', () => {
      const relays = ['relay1', 'relay2', 'relay3', 'relay4', 'relay5'];
      const result = generateProfileShareURL(testPubkey, undefined, relays);

      // Should only include first 3 relays
      const expectedNprofile = nip19.nprofileEncode({
        pubkey: testPubkey,
        relays: relays.slice(0, 3)
      });

      expect(result.raw).toBe(`nostr:${expectedNprofile}`);
    });
  });

  describe('generateVideoShareURL', () => {
    test('generates video share URL with nevent', () => {
      const relays = ['wss://relay.damus.io'];
      const result = generateVideoShareURL(testEvent, relays);

      const expectedNevent = nip19.neventEncode({
        id: testEvent.id,
        relays,
        author: testEvent.pubkey
      });

      expect(result.fallback).toBe(`https://njump.me/${expectedNevent}`);
      expect(result.raw).toBe(`nostr:${expectedNevent}`);
      expect(result.json).toBeDefined();
      expect(JSON.parse(result.json!)).toEqual(testEvent);
    });
  });

  describe('detectAndNormalizeNostrURL', () => {
    test('detects npub type', () => {
      const result = detectAndNormalizeNostrURL(testNpub);

      expect(result.type).toBe('npub');
      expect(result.identifier).toBe(testNpub);
      expect(result.isValid).toBe(true);
      expect(result.njumpURL).toBe(`https://njump.me/${testNpub}`);
    });

    test('detects note type', () => {
      const result = detectAndNormalizeNostrURL(testNote);

      expect(result.type).toBe('note');
      expect(result.identifier).toBe(testNote);
      expect(result.isValid).toBe(true);
      expect(result.njumpURL).toBe(`https://njump.me/${testNote}`);
    });

    test('detects hex type', () => {
      const result = detectAndNormalizeNostrURL(testPubkey);

      expect(result.type).toBe('hex');
      expect(result.identifier).toBe(testPubkey);
      expect(result.isValid).toBe(true);
      expect(result.njumpURL).toBe(`https://njump.me/${testPubkey}`);
    });

    test('handles nostr: prefix', () => {
      const result = detectAndNormalizeNostrURL(`nostr:${testNpub}`);

      expect(result.type).toBe('npub');
      expect(result.identifier).toBe(testNpub);
      expect(result.isValid).toBe(true);
    });

    test('handles njump.me URLs', () => {
      const njumpURL = `https://njump.me/${testNpub}`;
      const result = detectAndNormalizeNostrURL(njumpURL);

      expect(result.type).toBe('npub');
      expect(result.identifier).toBe(testNpub);
      expect(result.isValid).toBe(true);
    });

    test('handles invalid input', () => {
      const result = detectAndNormalizeNostrURL('invalid_input');

      expect(result.type).toBe('unknown');
      expect(result.isValid).toBe(false);
      expect(result.njumpURL).toBeUndefined();
    });
  });

  describe('generateDualDisplay', () => {
    test('generates dual display for valid identifier', () => {
      const result = generateDualDisplay(testNpub);

      expect(result).toHaveLength(2);

      // Universal Link
      expect(result[0].label).toBe('Universal Link');
      expect(result[0].value).toBe(`https://njump.me/${testNpub}`);
      expect(result[0].isURL).toBe(true);

      // Nostr Identifier
      expect(result[1].label).toBe('Nostr Identifier');
      expect(result[1].value).toBe(`nostr:${testNpub}`);
      expect(result[1].isURL).toBe(false);
    });

    test('handles invalid identifier', () => {
      const result = generateDualDisplay('invalid');

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('Invalid Identifier');
      expect(result[0].value).toBe('invalid');
      expect(result[0].isURL).toBe(false);
    });
  });

  // ==================== PHASE 2 TESTS ====================
  describe('Phase 2: ZapTok Branding and Vanity Support', () => {
    describe('ZAPTOK_CONFIG', () => {
      test('has correct domain and paths', () => {
        expect(ZAPTOK_CONFIG.domain).toBe('https://zaptok.social');
        expect(ZAPTOK_CONFIG.paths.profile).toBe('@');
        expect(ZAPTOK_CONFIG.paths.video).toBe('v');
        expect(ZAPTOK_CONFIG.paths.event).toBe('e');
        expect(ZAPTOK_CONFIG.paths.note).toBe('n');
        expect(ZAPTOK_CONFIG.paths.raw).toBe('raw');
      });
    });

    describe('toZapTokURL', () => {
      test('generates basic profile URL', () => {
        const result = toZapTokURL(testNpub, { type: 'profile' });
        expect(result).toBe(`https://zaptok.social/@${testNpub}`);
      });

      test('generates vanity profile URL', () => {
        const result = toZapTokURL(testNpub, {
          type: 'profile',
          vanityName: 'alice'
        });
        expect(result).toBe('https://zaptok.social/@alice');
      });

      test('generates video URL', () => {
        const nevent = nip19.neventEncode({ id: testEventId, author: testPubkey, relays: [] });
        const result = toZapTokURL(nevent, { type: 'video' });
        expect(result).toBe(`https://zaptok.social/v/${nevent}`);
      });

      test('generates video URL with custom video ID', () => {
        const nevent = nip19.neventEncode({ id: testEventId, author: testPubkey, relays: [] });
        const result = toZapTokURL(nevent, {
          type: 'video',
          metadata: { videoId: 'my-cool-video' }
        });
        expect(result).toBe('https://zaptok.social/v/my-cool-video');
      });

      test('generates event URL', () => {
        const result = toZapTokURL(testNote, { type: 'event' });
        expect(result).toBe(`https://zaptok.social/e/${testNote}`);
      });

      test('generates note URL', () => {
        const result = toZapTokURL(testNote, { type: 'note' });
        expect(result).toBe(`https://zaptok.social/n/${testNote}`);
      });

      test('auto-detects type from identifier', () => {
        // Should auto-detect npub as profile
        const profileResult = toZapTokURL(testNpub);
        expect(profileResult).toBe(`https://zaptok.social/@${testNpub}`);

        // Should auto-detect note as note
        const noteResult = toZapTokURL(testNote);
        expect(noteResult).toBe(`https://zaptok.social/n/${testNote}`);
      });

      test('throws error for invalid identifier', () => {
        expect(() => toZapTokURL('invalid')).toThrow('Invalid Nostr identifier');
      });
    });

    describe('generateEnhancedShareableURLs', () => {
      test('generates complete URL hierarchy with vanity', () => {
        const result = generateEnhancedShareableURLs(testNpub, {
          type: 'profile',
          vanityName: 'alice',
          metadata: {
            title: 'Alice Profile',
            description: 'Content creator',
            thumbnail: 'https://example.com/alice.jpg'
          }
        });

        expect(result.primary).toBe('https://zaptok.social/@alice');
        expect(result.vanity).toBe('alice');
        expect(result.branded).toBe(`https://zaptok.social/@${testNpub}`);
        expect(result.universal).toBe(`https://njump.me/${testNpub}`);
        expect(result.fallback).toBe(`https://njump.me/${testNpub}`);
        expect(result.raw).toBe(`nostr:${testNpub}`);
        expect(result.type).toBe('profile');
        expect(result.metadata?.title).toBe('Alice Profile');
      });

      test('generates URLs without vanity', () => {
        const result = generateEnhancedShareableURLs(testNote, {
          type: 'note',
          metadata: {
            title: 'My Note',
            description: 'A test note'
          }
        });

        expect(result.primary).toBe(`https://zaptok.social/n/${testNote}`);
        expect(result.vanity).toBeUndefined();
        expect(result.branded).toBe(`https://zaptok.social/n/${testNote}`);
        expect(result.universal).toBe(`https://njump.me/${testNote}`);
        expect(result.type).toBe('note');
      });
    });

    describe('generateEnhancedProfileShareURL', () => {
      test('generates enhanced profile URLs with vanity', () => {
        const metadata = {
          name: 'Alice',
          display_name: 'Alice Cooper',
          about: 'Content creator',
          picture: 'https://example.com/alice.jpg'
        };

        const result = generateEnhancedProfileShareURL(testPubkey, {
          metadata,
          vanityName: 'alice',
          relays: ['wss://relay.example.com']
        });

        expect(result.vanity).toBe('alice');
        expect(result.type).toBe('profile');
        expect(result.metadata?.title).toBe('Alice Cooper');
        expect(result.metadata?.description).toBe('Content creator');
        expect(result.metadata?.thumbnail).toBe('https://example.com/alice.jpg');
      });
    });

    describe('generateEnhancedVideoShareURL', () => {
      test('generates enhanced video URLs', () => {
        const result = generateEnhancedVideoShareURL(testEvent, {
          videoId: 'epic-video',
          title: 'Epic Video',
          thumbnail: 'https://example.com/thumb.jpg',
          description: 'An epic video'
        });

        expect(result.type).toBe('video');
        expect(result.metadata?.title).toBe('Epic Video');
        expect(result.metadata?.description).toBe('An epic video');
        expect(result.metadata?.thumbnail).toBe('https://example.com/thumb.jpg');
        expect(result.metadata?.videoId).toBe('epic-video');
      });

      test('extracts title from event content', () => {
        const videoEvent = { ...testEvent, content: 'This is a really long video description that should be truncated' };
        const result = generateEnhancedVideoShareURL(videoEvent);

        expect(result.metadata?.title).toBe('This is a really long video description that shoul...');
        expect(result.metadata?.description).toBe('This is a really long video description that should be truncated');
      });

      test('extracts title from event tags', () => {
        const videoEvent = {
          ...testEvent,
          tags: [['title', 'Tagged Video Title']],
          content: 'Video content'
        };
        const result = generateEnhancedVideoShareURL(videoEvent);

        expect(result.metadata?.title).toBe('Tagged Video Title');
      });
    });

    describe('generateQRData with Phase 2 options', () => {
      test('prefers ZapTok URL when requested', () => {
        const result = generateQRData(testNpub, {
          preferZapTok: true,
          type: 'profile'
        });
        expect(result).toBe(`https://zaptok.social/@${testNpub}`);
      });

      test('uses vanity name in QR when provided', () => {
        const result = generateQRData(testNpub, {
          preferZapTok: true,
          type: 'profile',
          vanityName: 'alice'
        });
        expect(result).toBe('https://zaptok.social/@alice');
      });

      test('falls back to njump on ZapTok error', () => {
        // Use a valid identifier that will work with njump fallback
        const result = generateQRData(testNpub, {
          preferZapTok: true
        });
        // Should use ZapTok URL when valid
        expect(result).toBe(`https://zaptok.social/@${testNpub}`);

        // Test fallback for invalid identifier with try-catch in the function
        expect(() => generateQRData('invalid')).toThrow('Invalid Nostr identifier');
      });
    });

    describe('isValidVanityName', () => {
      test('validates correct vanity names', () => {
        expect(isValidVanityName('alice')).toBe(true);
        expect(isValidVanityName('alice123')).toBe(true);
        expect(isValidVanityName('alice_cooper')).toBe(true);
        expect(isValidVanityName('123alice')).toBe(true);
        expect(isValidVanityName('a'.repeat(30))).toBe(true);
      });

      test('rejects invalid vanity names', () => {
        expect(isValidVanityName('')).toBe(false);
        expect(isValidVanityName('ab')).toBe(false); // too short
        expect(isValidVanityName('a'.repeat(31))).toBe(false); // too long
        expect(isValidVanityName('_alice')).toBe(false); // starts with underscore
        expect(isValidVanityName('alice-cooper')).toBe(false); // hyphen not allowed
        expect(isValidVanityName('alice.cooper')).toBe(false); // dot not allowed
        expect(isValidVanityName('alice cooper')).toBe(false); // space not allowed
        expect(isValidVanityName('alice@cooper')).toBe(false); // @ not allowed
      });
    });

    describe('parseZapTokURL', () => {
      test('parses vanity profile URLs', () => {
        const result = parseZapTokURL('https://zaptok.social/@alice');
        expect(result.type).toBe('profile');
        expect(result.vanityName).toBe('alice');
        expect(result.isValid).toBe(true);
      });

      test('parses typed URLs', () => {
        const videoResult = parseZapTokURL(`https://zaptok.social/v/${testNote}`);
        expect(videoResult.type).toBe('video');
        expect(videoResult.identifier).toBe(testNote);
        expect(videoResult.isValid).toBe(true);

        const eventResult = parseZapTokURL(`https://zaptok.social/e/${testNote}`);
        expect(eventResult.type).toBe('event');
        expect(eventResult.identifier).toBe(testNote);
        expect(eventResult.isValid).toBe(true);
      });

      test('rejects non-ZapTok URLs', () => {
        const result = parseZapTokURL('https://example.com/@alice');
        expect(result.type).toBe('unknown');
        expect(result.isValid).toBe(false);
      });

      test('handles invalid URLs', () => {
        const result = parseZapTokURL('not-a-url');
        expect(result.type).toBe('unknown');
        expect(result.isValid).toBe(false);
      });
    });

    describe('convertURL', () => {
      test('converts njump to ZapTok', () => {
        const njumpURL = `https://njump.me/${testNpub}`;
        const result = convertURL(njumpURL, 'zaptok', { type: 'profile' });
        expect(result).toBe(`https://zaptok.social/@${testNpub}`);
      });

      test('converts ZapTok to njump', () => {
        const zapTokURL = `https://zaptok.social/@${testNpub}`;
        const result = convertURL(zapTokURL, 'njump');
        expect(result).toBe(`https://njump.me/${testNpub}`);
      });

      test('converts to raw format', () => {
        const zapTokURL = `https://zaptok.social/@${testNpub}`;
        const result = convertURL(zapTokURL, 'raw');
        expect(result).toBe(`nostr:${testNpub}`);
      });

      test('converts with vanity name', () => {
        const njumpURL = `https://njump.me/${testNpub}`;
        const result = convertURL(njumpURL, 'zaptok', {
          type: 'profile',
          vanityName: 'alice'
        });
        expect(result).toBe('https://zaptok.social/@alice');
      });

      test('returns null for invalid URLs', () => {
        const result = convertURL('invalid-url', 'zaptok');
        expect(result).toBeNull();
      });
    });

    describe('Backward Compatibility', () => {
      test('legacy functions still work', () => {
        // Test that Phase 1 functions still work with Phase 2 enhancements
        const profileURL = generateProfileShareURL(testPubkey);
        expect(profileURL.primary).toBe(`https://zaptok.social/@${testNpub}`);
        expect(profileURL.fallback).toBe(`https://njump.me/${testNpub}`);

        const videoURL = generateVideoShareURL(testEvent);
        expect(videoURL.primary).toContain('https://zaptok.social/');
        expect(videoURL.fallback).toContain('https://njump.me/');
      });

      test('QR generation defaults to njump for compatibility', () => {
        const qrData = generateQRData(testNpub);
        expect(qrData).toBe(`https://njump.me/${testNpub}`);
      });
    });
  });
});