import { getAmountFromInvoice } from '@/lib/lightning';
import { Event } from 'nostr-tools';

export function getZapInfoFromEvent(receiptEvent: Event) {
  try {
    let senderPubkey: string | undefined
    let recipientPubkey: string | undefined
    let eventId: string | undefined
    let originalEventId: string | undefined
    let invoice: string | undefined
    let amount = 0
    let comment: string | undefined
    let preimage: string | undefined
    let description: string | undefined

    receiptEvent.tags.forEach((tag) => {
      const [tagName, tagValue] = tag
      switch (tagName) {
        case 'bolt11':
          invoice = tagValue
          break
        case 'description':
          description = tagValue
          break
        case 'P':
          senderPubkey = tagValue
          break
        case 'p':
          recipientPubkey = tagValue
          break
        case 'e':
          if (!eventId) {
            eventId = tagValue
          }
          if (tag[3] === 'root') {
            originalEventId = tagValue
          } else if (tag[3] === 'reply') {
            originalEventId = eventId
            eventId = tagValue
          }
          break
        case 'preimage':
          preimage = tagValue
          break
      }
    })
    if (!recipientPubkey || !invoice) return null
    amount = invoice ? getAmountFromInvoice(invoice) : 0
    if (description) {
      try {
        const zapRequest = JSON.parse(description)
        comment = zapRequest.content
        if (!senderPubkey) {
          senderPubkey = zapRequest.pubkey
        }
      } catch {
        // ignore
      }
    }

    return {
      senderPubkey,
      recipientPubkey,
      eventId,
      originalEventId,
      invoice,
      amount,
      comment,
      preimage
    }
  } catch {
    return null
  }
}