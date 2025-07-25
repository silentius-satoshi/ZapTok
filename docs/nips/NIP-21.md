NIP-21
======

`nostr:` URI scheme
-------------------

`draft` `optional`

This NIP standardizes the usage of a common URI scheme for clients to use to refer to nostr resources. These URIs can then be used to refer to nostr resources in web browsers, QR codes, emails, or any other context where a URI string is appropriate.

## The scheme

The scheme is `nostr:`.

The path portion of the URI is a bech32-encoded string as specified by [NIP-19](19.md), plus an optional `relay` query string parameter.

The URI is constructed by concatenating the following:
- The string `nostr:`
- The bech32-encoded string as specified by [NIP-19](19.md)

## Examples

- `nostr:npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56z8lflp6tp45zhfqgjrqdu6zh` refers to a profile
- `nostr:note1fntxtkcy9pjwucqwa9mddn7v03wwwsu9j330jj350nvhpky2tuaspk6nqc` refers to a note
- `nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9` refers to an event
- `nostr:naddr1qqxnzdesxqmnxvpexqunzvpcxqcrqvpsxqmnyv33x56nqdesxgezvd3cxgcnjwpkxscnjwp4956nqvf5x5mrywf5xg6nzwf4xsenjd3cxgmrsd3cxg6nzwp4x5635v3ex5eqzvpkx5cnzde3956nqwf4x5635v3exgcrqvfexgungvf3xguryve3x33nqvf4xvenxve3xgmnyde3956nqdekx3jngvnpxqcrqvpcxqcrqvpsx9nr2de5956nqwpkx5unyv3e9w9g` refers to a parameterized replaceable event

## Usage

Clients that can parse nostr: URIs SHOULD open them by decoding the bech32 string and displaying the referenced resource to the user.

When sharing nostr resources, clients SHOULD generate and use nostr: URIs instead of web URLs, when possible, as these allow users to choose which client they want to use to view the resource.