# NIP-05 Domain Verification Guide

This guide helps you verify that your NIP-05 domain verification setup is working correctly.

## Current Setup

Your ZapTok application has been configured with NIP-05 domain verification infrastructure:

- **Domain**: `zaptok.social` (example domain for verification)
- **Verification file**: `public/.well-known/nostr.json`
- **Current mapping**: `_@zaptok.social` → `3f9296e008ada9a328d176d7fe69d6ebb82dd2d47305229de17f1868e6da5a3d`

**Note**: Users can use their own domains for NIP-05 verification. This setup demonstrates the infrastructure.

## Verification Steps

### 1. Local File Verification ✅

The local `nostr.json` file exists and is valid:
```json
{
  "names": {
    "_": "3f9296e008ada9a328d176d7fe69d6ebb82dd2d47305229de17f1868e6da5a3d"
  },
  "relays": {
    "3f9296e008ada9a328d176d7fe69d6ebb82dd2d47305229de17f1868e6da5a3d": [
      "wss://relay.nostr.band",
      "wss://relay.damus.io", 
      "wss://relay.snort.social"
    ]
  }
}
```

### 2. Deployment Configuration ⚠️

The Vercel configuration has been updated to properly serve the NIP-05 file:
- Added rewrite rules in `vercel.json`
- Configured proper headers (CORS, Content-Type)
- Ready for deployment

**Current Status**: ✅ **LIVE** - File is now accessible at `https://zaptok.social/.well-known/nostr.json`

### 3. Manual Verification Steps

✅ **Ready for Testing** - You can now verify the setup works:

#### Browser Test
1. Visit: https://zaptok.social/.well-known/nostr.json
2. Should return the JSON response without errors
3. Check that Content-Type is `application/json` (use F12 → Network tab to verify headers)

#### cURL Test
```bash
curl -s https://zaptok.social/.well-known/nostr.json | jq
```

#### JavaScript Console Test
```javascript
fetch('https://zaptok.social/.well-known/nostr.json')
  .then(response => {
    console.log('Content-Type:', response.headers.get('content-type'));
    return response.json();
  })
  .then(data => {
    console.log('NIP-05 data:', data);
    console.log('Default user pubkey:', data.names._);
  });
```

### 4. Test in Nostr Clients

Once the endpoint is live, test in various Nostr clients:

#### Primal.net
1. Go to https://primal.net
2. Search for `_@zaptok.social`
3. Should show the profile with a verified checkmark

#### Damus (iOS/macOS)
1. Search for `_@zaptok.social`
2. Profile should show verification badge

#### Snort.social
1. Visit https://snort.social
2. Search for the NIP-05 identifier
3. Look for verification indicator

### 5. Programmatic Verification

Use the test script:
```bash
node scripts/test-nip05.js
```

### 6. Using nostr-tools Library

```javascript
import { nip05 } from 'nostr-tools';

// Test verification
const profile = await nip05.queryProfile('_@zaptok.social');
console.log('Profile:', profile);

// Test validation
const isValid = await nip05.isValid(
  '3f9296e008ada9a328d176d7fe69d6ebb82dd2d47305229de17f1868e6da5a3d',
  '_@zaptok.social'
);
console.log('Is valid:', isValid);
```

## Next Steps

### Immediate (After Deployment)
1. **Deploy the changes** to make the endpoint live
2. **Run verification tests** using the provided scripts
3. **Test in multiple Nostr clients** to confirm interoperability

### Future Enhancements
1. **Add more users**: Update `nostr.json` with additional username mappings
2. **Dynamic generation**: Consider generating the file from user profiles
3. **Monitoring**: Set up monitoring to ensure the endpoint stays available

## Troubleshooting

### Common Issues

#### 404 Not Found
- Ensure the `public/.well-known/nostr.json` file is deployed
- Check Vercel configuration includes rewrite rules
- Verify build/deployment process includes static files

#### CORS Errors
- Headers are configured in `vercel.json`
- Ensure `Access-Control-Allow-Origin: *` is set

#### Invalid JSON
- Validate JSON format with `jq` or online validators
- Check for trailing commas or syntax errors

#### Verification Failures
- Confirm pubkey matches exactly (64-character hex)
- Test with different Nostr clients
- Check relay connectivity

### Debug Commands

```bash
# Check if file is accessible
curl -I https://zaptok.social/.well-known/nostr.json

# Test with verbose output
curl -v https://zaptok.social/.well-known/nostr.json

# Validate JSON format
curl -s https://zaptok.social/.well-known/nostr.json | jq empty

# Test query parameter support
curl "https://zaptok.social/.well-known/nostr.json?name=_"
```

## Implementation Details

### How It Works
1. **User Profile**: User sets NIP-05 field to their chosen identifier (e.g., `username@their-domain.com`)
2. **Client Verification**: Nostr clients fetch the domain's `/.well-known/nostr.json?name=username`
3. **Pubkey Matching**: Client verifies the returned pubkey matches the user's actual pubkey
4. **Display**: Verified users get checkmarks or badges in client UIs

### Security Considerations
- **HTTPS Required**: NIP-05 verification only works over HTTPS
- **Pubkey Accuracy**: Ensure pubkeys in the JSON file are correct
- **Domain Control**: Only add mappings for users you can verify

### Performance
- **Caching**: Clients typically cache verification results
- **CDN**: Vercel's CDN will help with global availability
- **Monitoring**: Consider uptime monitoring for the endpoint

## Success Indicators

✅ **Setup Complete When**:
- [x] `https://zaptok.social/.well-known/nostr.json` returns valid JSON ✅ **WORKING**
- [ ] Test script passes all checks
- [ ] Nostr clients show verification badges
- [ ] Users can successfully set their own NIP-05 identifiers from any domain

🎉 **Ready for Production**: Your NIP-05 verification system enables users to have verified Nostr identities tied to any domain they control!
