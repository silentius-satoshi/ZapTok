# Cashu NUTs (Notation, Usage, and Terminology)

This directory contains the complete set of official Cashu protocol specifications for reference during development.

Source: [https://github.com/cashubtc/nuts](https://github.com/cashubtc/nuts)  
Documentation: [https://cashubtc.github.io/nuts/](https://cashubtc.github.io/nuts/)

## Specifications

Wallets and mints **MUST** implement all mandatory specs and **CAN** implement optional specs.

### Mandatory

| NUT | Description |
|-----|-------------|
| 00  | Cryptography and Models |
| 01  | Mint public keys |
| 02  | Keysets and fees |
| 03  | Swapping tokens |
| 04  | Minting tokens |
| 05  | Melting tokens |
| 06  | Mint info |

### Optional

| NUT | Description | Status |
|-----|-------------|--------|
| 07  | Token state check | Widely supported |
| 08  | Overpaid Lightning fees | Widely supported |
| 09  | Signature restore | Partially supported |
| 10  | Spending conditions | Widely supported |
| 11  | Pay-To-Pubkey (P2PK) | Widely supported |
| 12  | DLEQ proofs | Widely supported |
| 13  | Deterministic secrets | Wallet-side only |
| 14  | Hashed Timelock Contracts (HTLCs) | Widely supported |
| 15  | Partial multi-path payments (MPP) | Widely supported |
| 16  | Animated QR codes | Wallet-side only |
| 17  | WebSocket subscriptions | Widely supported |
| 18  | Payment requests | Wallet-side only |
| 19  | Cached Responses | Mint-side only |
| 20  | Signature on Mint Quote | Growing support |
| 21  | Clear authentication | Widely supported |
| 22  | Blind authentication | Widely supported |
| 23  | Payment Method: BOLT11 | Widely supported |
| 24  | HTTP 402 Payment Required | Experimental |
| 25  | Payment Method: BOLT12 | Growing support |

## Additional Files

- `error_codes.md` - Standard error codes used throughout the protocol

## About

These documents specify parts of the Cashu protocol. The Cashu protocol is an open-source implementation of Chaumian Ecash for Bitcoin using Lightning Network for payments.

### License

MIT License - See individual files for licensing information.
