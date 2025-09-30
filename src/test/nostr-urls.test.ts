/**
 * Unit tests for nostr-urls.ts
 * Tests URL conversion, validation, and sharing functionality
 */

import { describe, test, expect } from 'vitest';
import { nip19 } from 'nostr-tools';
import {
  isValidNostrIdentifier,
  toNjumpURL,
  pubkeyToNjumpURL,
  eventToNjumpURL,
  naddrToNjumpURL,
  generateShareableURLs,
  generateQRData,
  generateProfileShareURL,
  generateVideoShareURL,
  detectAndNormalizeNostrURL,
  generateDualDisplay
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

  describe('eventToNjumpURL', () => {
    test('converts event to njump URL', () => {
      const result = eventToNjumpURL(testEvent, ['wss://relay.damus.io']);
      const expectedNevent = nip19.neventEncode({
        id: testEvent.id,
        relays: ['wss://relay.damus.io'],
        author: testEvent.pubkey
      });
      expect(result).toBe(`https://njump.me/${expectedNevent}`);
    });

    test('handles events without relays', () => {
      const result = eventToNjumpURL(testEvent);
      const expectedNevent = nip19.neventEncode({
        id: testEvent.id,
        relays: [],
        author: testEvent.pubkey
      });
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
      
      expect(result.primary).toBe(`https://njump.me/${testNpub}`); // Will be zaptok.social in Phase 2
      expect(result.fallback).toBe(`https://njump.me/${testNpub}`);
      expect(result.raw).toBe(`nostr:${testNpub}`);
      expect(result.json).toBeUndefined();
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
});