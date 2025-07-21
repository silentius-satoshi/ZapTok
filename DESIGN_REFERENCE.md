# Cashu UI/UX Design Reference

This document captures design patterns and UX insights from the provided SolidJS Cashu components for future enhancement of our React-based NIP-60/NIP-61 implementation.

## Key Design Patterns Identified

### 1. Cashu Token Display (`Cashu.tsx`)

**Current Features:**
- **Token Header**: Icon + title with action buttons (QR, copy)
- **Token Body**: Description and amount display
- **Token Footer**: Mint info and action buttons
- **State Management**: Spendable/spent status with visual feedback
- **Payment Overlay**: Loading state during redemption

**React Implementation Opportunities:**
```tsx
// Enhanced token display component
interface CashuTokenCardProps {
  token: string;
  memo?: string;
  onRedeem?: () => void;
  isSpendable?: boolean;
}
```

### 2. QR Code Modal (`CashuQrCodeModal.tsx`)

**Current Features:**
- **Dedicated QR Modal**: Clean, focused token display
- **Token Details**: Description, amount, mint info
- **Action Integration**: Direct redemption from modal

**React Implementation Opportunities:**
- Integrate with our existing `QRModal` component
- Add Cashu-specific QR styling
- Support both nutzap and regular token display

### 3. Visual Design System (`.scss`)

**Key Visual Elements:**
- **Consistent Spacing**: 12px padding, 6px gaps
- **Color Scheme**: Primary/secondary text, accent colors
- **State Indicators**: Success (green), expired/spent states
- **Icon System**: SVG masks with color variables
- **Responsive Layout**: Flexible min-heights, proper button sizing

## UI/UX Enhancement Opportunities

### 1. Cashu Token Cards for Nutzaps

**Current State**: Basic pending nutzaps list
**Enhancement**: Rich token cards similar to reference

```tsx
// Enhanced nutzap display
interface NutzapTokenCard {
  nutzap: NutzapEvent;
  amount: number;
  mint: string;
  comment?: string;
  sender: string;
  onClaim: () => void;
  onViewQR: () => void;
}
```

### 2. Visual States & Feedback

**Reference Patterns:**
- ✅ **Spendable State**: Green indicators, claim buttons
- ❌ **Spent State**: Grayed out with "spent" label
- ⏳ **Loading State**: Overlay with spinner
- 📋 **Copy Feedback**: Checkmark animation

**Implementation:**
```scss
.nutzap-card {
  &.spendable {
    border-color: var(--success-color);
    .claim-button { background: var(--success-color); }
  }
  
  &.spent {
    opacity: 0.6;
    .amount { text-decoration: line-through; }
  }
  
  &.claiming .payment-overlay {
    // Loading overlay during claim
  }
}
```

### 3. Enhanced Token Display

**Reference Features:**
- **Amount Prominence**: Large, bold amount display
- **Mint Hostname**: Clean URL display without protocol
- **Memo Support**: Description/comment display
- **Icon Integration**: Cashu logo, payment icons

### 4. Modal Enhancements

**Reference Pattern**: Dedicated token modals
**Our Implementation**: Enhance existing modals

```tsx
// Modal types for different Cashu operations
type CashuModalType = 
  | 'nutzap-received'  // Show received nutzap details
  | 'nutzap-send'      // Send nutzap interface
  | 'token-details'    // General token information
  | 'mint-info'        // Mint server details
```

## Specific Enhancement Roadmap

### Phase 1: Visual Improvements
1. **Enhanced Token Cards**
   - Rich nutzap display with amounts, memos, sender info
   - Proper state indicators (claimable/claimed/expired)
   - Copy token functionality with feedback

2. **Better Loading States**
   - Payment overlays during claim operations
   - Skeleton loading for token lists
   - Progress indicators for multi-step operations

### Phase 2: Interaction Improvements
1. **QR Code Integration**
   - Dedicated nutzap QR modals
   - Token sharing via QR codes
   - Mobile-friendly token scanning

2. **Enhanced Actions**
   - Quick copy token strings
   - Share tokens via various methods
   - Batch operations for multiple tokens

### Phase 3: Advanced Features
1. **Token Management**
   - Token history and tracking
   - Mint reputation and health indicators
   - Token expiry warnings

2. **User Experience**
   - Onboarding flows for new users
   - Contextual help and tooltips
   - Accessibility improvements

## Design System Integration

### Color Scheme Mapping
```scss
:root {
  // Map reference colors to our existing system
  --cashu-primary: var(--green-400);    // Success/spendable
  --cashu-secondary: var(--gray-400);   // Secondary text
  --cashu-spent: var(--gray-600);       // Spent tokens
  --cashu-accent: var(--purple-400);    // Nutzap accent
}
```

### Component Architecture
```
CashuWalletCard/
├── NutzapTokenCard/     // Individual token display
├── NutzapList/          // Token list management
├── CashuQRModal/        // Token QR display
├── NutzapSendForm/      // Send nutzap interface
└── TokenActionMenu/     // Copy, share, details
```

## Implementation Notes

### State Management Patterns
- **Token Status Checking**: Async validation against mints
- **Real-time Updates**: WebSocket or polling for token status
- **Optimistic UI**: Immediate feedback with rollback capability

### Error Handling
- **Network Issues**: Graceful degradation for mint connectivity
- **Invalid Tokens**: Clear error messages and recovery options
- **Expired Tokens**: Visual indicators and cleanup suggestions

### Performance Considerations
- **Token Validation**: Batch checking for better performance
- **Image Assets**: Optimize SVG icons and loading states
- **Memory Management**: Proper cleanup of token watchers

## Future Research Areas

1. **Mobile Experience**: Touch-friendly token interactions
2. **Accessibility**: Screen reader support for token amounts
3. **Internationalization**: Multi-currency and language support
4. **Security**: Safe token handling and display practices

This reference will guide our iterative improvements to create a polished, user-friendly Cashu/Nutzap experience that matches or exceeds the quality of the reference implementation.