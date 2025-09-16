<div align="center">

<a href="https://chorus.community/group/34550%3A8b12bddc423189c660156eab1ea04e1d44cc6621c550c313686705f704dda895%3Azaptok-mdgpgdbb">
    <img src="./public/images/ZapTok-v3.png" alt="ZapTok Logo" title="ZapTok logo" width="200"/>
</a>

</div>

## Overview

ZapTok is an open-source, decentralized short-form video platform where instant Bitcoin meets endless swipeable content — enabling direct creator monetization through value-for-value on Nostr.

We deliver censorship-resistant content sharing with lightning-fast Bitcoin tips (aka zaps), giving creators and users complete control over their data and earnings. Experience familiar social media with true ownership and privacy — where your content and earnings are actually yours.

***You keep 100% of your earnings. No percentage of your earnings is distributed to the platform.***

### Phase 1: Foundation (Completed ✅)
**Core Platform & Authentication**
- [x] Private login via Nostr browser extension + bunker login (NIP-07, NIP-46)
- [x] Lightning & Cashu wallet support (NIP-47, NIP-60, NIP-61)
- [x] Enhanced video encoding and streaming (NIP-71)
- [x] Multi-relay support and relay management
- [x] Basic content moderation tools
- [x] Comments system (NIP-22) 


**Creator Economy Basics**
- [x] Lightning Network integration for instant zap functionality (NIP-57)
- [x] Cashu wallet integration for eCash payments (NIP-60)
- [x] Nutzaps for peer-to-peer eCash tips (NIP-61)
- [x] Supporter donation system with multiple payment pathways
- [x] Creator-first monetization with zero platform fees

**Infrastructure**
- [x] Decentralized storage integration (NIP-94 file metadata)
- [x] Bech32 address support (NIP-19)
- [x] DNS-based verification (NIP-05)
- [x] Client-side video compression for mobile data optimization

**Progressive Web App Features**
- [x] Full PWA support with service worker
- [x] Offline video caching and playback
- [x] Push notifications for Lightning payments
- [x] App installation on mobile and desktop
- [x] Background sync for failed transactions

**Advanced Video Experience**
- [x] Infinite scroll with snap-to-video behavior
- [x] Keyboard navigation (arrow keys)
- [x] Auto-loading and background prefetching
- [x] Mobile-optimized player with gesture controls
- [x] Performance caching for smooth playback
- [x] Native share functionality (Web Share API with clipboard fallback)


### Phase 2: Social Features (Completed ✅)
**Essential Social**
- [x] Follow Lists (NIP-02)
- [x] Reactions & Engagement (NIP-25)
- [x] User Profiles & Metadata (NIP-01, kind 0)
- [x] Threaded comments system with NIP-22 (replies, mentions & notifications)
- [x] Native share functionality across platforms

**Content & Discovery**
- [x] Video Events (NIP-71)
- [x] File metadata support (NIP-94)
- [x] Hashtag Following and Custom Hashtags
- [x] Reposts & Share functionality (NIP-18)
- [x] Content Search and filtering capabilities

**Infrastructure Improvements**
- [x] Enhanced video upload with progress indicators
- [x] Improved error handling and user feedback
- [x] Performance optimizations for faster load times
- [x] Scalability improvements for larger user base
- [x] Full PWA implementation with offline capabilities
- [x] Advanced caching system with video prefetching
- [x] Mobile-responsive design and PWA enhancements

**Future Social Features**
- [ ] Private Direct Messages (NIP-17)
- [ ] Advanced Content Search (NIP-50)
- [ ] Enhanced notification system

### Phase 3: Advanced Platform (Planned)
**Enhanced Creator Tools**
- [x] Zaps & Advanced Tipping (NIP-57)
- [ ] Zap Goals & Splits (NIP-75)
- [ ] Badges & Creator Recognition (NIP-58)
- [ ] Long-form Content Support (NIP-23)

**Community Features**
- [ ] Live Streaming & Activities (NIP-53)
- [ ] Creator Communities & Groups (NIP-72)
- [ ] Interactive Polls & Voting (NIP-69)
- [ ] Public Chat Rooms (NIP-28)

**Platform Evolution**
- [ ] Video Creator Marketplace (NIP-15)
- [ ] Advanced Multi-Account Management
- [ ] Cross-Client Compatibility Standards

## Philosophy

ZapTok believes in:
- **Self sovereignty**: Users own their data, identity, and monetary interactions - no intermediaries, no gatekeepers
- **Creator-first economy**: Tools and features that empower creators to monetize directly without middlemen taking a cut
- **Interoperability**: Seamless integration with other Nostr apps and services for a unified user experience
- **Open source**: Transparent, auditable code that the community can verify and improve
- **Privacy by design**: Built-in privacy protections, not afterthoughts or add-ons
- **Censorship resistance**: Decentralized architecture with no single point of failure or control 



## How ZapTok's Protocol Integration Benefits You:

For Creators:
Own Your Brand & Earnings

- Keep your identity and follower relationships (Nostr) - no platform can delete you
- Receive instant Bitcoin tips (aka lightning zaps in satoshis) with zero platform fees
- Get paid 24/7 from a global audience without banking restrictions
- Build once, publish everywhere - your content works across Nostr apps
- No chargebacks or payment reversals on zaps received
  
For Viewers/Fans:
True Privacy & Control

- Watch and interact without giving up personal data
- Tip creators directly with pseudo-anonymous Bitcoin zap payments
- Your viewing history and preferences stay private by design
- Access content that can't be censored or geo-blocked
- Use the same identity across all Nostr-compatible apps
  
For Everyone:
Bulletproof & Transparent

- No single company can shut down the network of relays or your nostr account
- Open source code - verify security and suggest improvements
- Real-time interactions without corporate algorithms deciding what you see
- Global access - works the same no matter the location as long as you have internet access 
- Your posts and social connections are portable between platforms


## Community

- **Nostr**: Follow #ZapTok tag for updates
- **+Chorus community**: [chorus.community/zaptok](https://chorus.community/group/34550%3A8b12bddc423189c660156eab1ea04e1d44cc6621c550c313686705f704dda895%3Azaptok-mdgpgdbb)
- **GitHub**: Star the repository and watch for updates
- **Website**: [zaptok-labs.vercel.app](https://zaptok-labs.vercel.app/)

### Future Vision
**Complete Nostr Ecosystem**
<details>
<summary>Full NIP Implementation Status (Click to expand)</summary>

**✅ Fully Implemented**
- NIP-01: Basic protocol flow description
- NIP-02: Contact List and Petnames  
- NIP-05: DNS-based verification
- NIP-07: Browser extension interface
- NIP-10: Conventions for `e` and `p` tags (replies/mentions)
- NIP-18: Reposts and Share functionality
- NIP-19: Bech32-encoded entities
- NIP-22: Comments (threaded discussion system)
- NIP-25: Reactions
- NIP-46: Nostr Connect
- NIP-47: Wallet Connect
- NIP-57: Lightning Zaps
- NIP-60: Cashu Wallets
- NIP-61: Nutzaps
- NIP-71: Video Events
- NIP-94: File Metadata

**Partially Implemented**
- NIP-50: Search Capability (basic filtering implemented, advanced search planned)

**Planned for Implementation**
- NIP-17: Private Direct Messages
- NIP-53: Live Activities
- NIP-75: Zap Goals

**Research & Future Consideration**
- NIP-03: OpenTimestamps Attestations
- NIP-32: Content Labeling
- NIP-92: Media Attachments
- NIP-96: File Storage Integration
- Bandwidth Optimization
- CDN/Mirror Integration
- Content Licensing & Rights Management
- Creator Analytics
- Creator Revenue Splits
- Cross-Platform Embedding
- Paywall Integrations
- Playlist Support
- Recurring Payments/Subscriptions
- Video Annotations & Timestamps
- Video Quality Metadata

</details>

---

### Community Driven
This roadmap evolves based on:
- Community feedback and feature requests
- Nostr protocol development (NIPs)
- Bitcoin / Lightning Network / Cashu improvements
- Creator and user needs

**Want to contribute?** Check our [Contributing Guidelines](CONTRIBUTING.md) or [open an issue](https://github.com/silentius-satoshi/ZapTok/issues) to suggest features!

---

## License

ZapTok is licensed under the **MIT License**.

### Copyright Notice

Copyright (c) 2025 @silentius

For the complete license text, see the [LICENSE](./LICENSE) file.

---

## Support ZapTok

Help us continue building and improving ZapTok. Your support enables us to maintain the platform, add new features, and keep the community growing.

<div align="center">

<img src="./public/images/qr-code-donation.png" alt="Donation QR Code" width="192" height="192" style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"/>

<br/>

*Scan to support ZapTok development*

</div>

## Acknowledgments & Credits

ZapTok stands on the shoulders of giants. We're deeply grateful to the open-source communities and visionary builders who made this platform possible:

### Nostr Ecosystem Builders
- **[Amethyst](https://github.com/vitorpamplona/amethyst)** **([amethyst.social](https://www.amethyst.social/))** - Nostr client for Android
- **[Chorus](https://github.com/andotherstuff/chorus)** **([chorus.community](https://chorus.community/)** - Grow your community and gather support on the decentralized Nostr protocol with eCash
- **[Damus](https://github.com/damus-io)** **([damus.io](https://damus.io/))** - iOS nostr client
- **[Nostr Band](https://github.com/nostrband)** **[nostr.band](https://nostr.band/))** - Nostr profile viewer and search engine
- **[Plebs](https://github.com/Spl0itable/plebs-app)** **([plebs.app](https://plebs.app/))** - Plebs is a censorship-resistant, decentralized video platform powered by the Nostr social protocol
- **[Primal](https://github.com/PrimalHQ)** **([primal.net](https://primal.net/))** - Primal's iOS/web app for Nostr; as experienced on primal.net
- **[Snort](https://github.com/v0l/snort)** **([phoenix.social](https://phoenix.social/))** - Feature packed nostr web UI, Mirror of https://git.v0l.io/Kieran/snort 
- **[Zappix](https://github.com/derekross/zappix)** **([Zappix.app](https://zappix.app/home))** - A nostr image sharing application for browsing, sharing, and zapping visual content
- **[Zap.stream](https://github.com/v0l/zap.stream)** **([Zap.stream](https://zap.stream/))** - Nostr live streaming


### Technical Foundation
- **React Team** - The UI framework powering our interface
- **Vite & Tailwind CSS** - Development tools enabling rapid iteration
- **[Nostr Protocol](https://github.com/nostr-protocol/nips)** - Collectively building the Nostr specification
- **[Bitcoin Connect](https://github.com/getAlby/bitcoin-connect)** **([Alby/Bitcoin-Connect](https://bitcoin-connect.com/))** - Connecting lightning wallets to your webapp has never been easier. Enable WebLN in all browsers with a single button
- **[Cashu Protocol](https://github.com/cashubtc)** **([cashu.space](https://cashu.space))** - Cashu is ecash for Bitcoin
- **[Blossom Protocol](https://github.com/hzrd149/blossom)** - Decentralized file storage solutions using nostr public / private keys 
- **[Nostr Logins](https://github.com/nostrband/nostr-login)** -  powerful window.nostr provider
- **[NoAuth](https://github.com/nostrband/noauth)** **([nsec.app](https://nsec.app/))** - Noauth Nostr key manager
- **[MKStack](https://soapbox.pub/mkstack)** **([Gitlab](https://gitlab.com/soapbox-pub/mkstack))** - Nostr client framework for web.

*Building on Nostr means building together. Every contribution to the ecosystem benefits everyone.*

---

<div align="center">

Built with ❤️ for our Nostr communities & the Decentralized, Open-Source Web by [@silentius](https://nostr.band/npub13vftmhzzxxyuvcq4d643agzwr4zvce3pc4gvxymgvuzlwpxa4z2sq4sjd9)

</div>
