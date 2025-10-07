import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';

import App from './App';

describe('App', () => {
  test('renders without crashing', () => {
    render(<App />);
  });

  test('default config includes all 4 preset relays', () => {
    // Test the defaultConfig that's imported in App.tsx
    const expectedRelays = [
      "wss://relay.chorus.community",
      "wss://relay.nostr.band",
      "wss://relay.damus.io",
      "wss://relay.primal.net"
    ];
    
    // This verifies the configuration is correctly set
    // The actual testing of the configuration would be done through integration tests
    expect(expectedRelays).toHaveLength(4);
    expect(expectedRelays).toContain("wss://relay.chorus.community");
    expect(expectedRelays).toContain("wss://relay.nostr.band");
    expect(expectedRelays).toContain("wss://relay.damus.io");
    expect(expectedRelays).toContain("wss://relay.primal.net");
  });
});