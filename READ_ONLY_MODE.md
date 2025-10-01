# Read-Only Mode Implementation

This implementation adds comprehensive read-only mode support to ZapTok, allowing users to browse and discover content without requiring full authentication. The implementation is based on Jumble's proven patterns for handling non-authenticated users.

## Architecture Overview

### Core Components

1. **ReadOnlySigner** (`src/hooks/useReadOnlySigner.ts`)
   - Provides public key access without signing capabilities
   - Throws descriptive errors for signing operations
   - Maintains consistent interface with other signers

2. **Enhanced useCurrentUser** (`src/hooks/useCurrentUser.ts`)
   - Adds read-only capability detection
   - Provides `canSign`, `isReadOnly`, `checkLogin` properties
   - Maintains backward compatibility

3. **LoginPrompt Components** (`src/components/auth/LoginPrompt.tsx`)
   - Reusable login prompts for different scenarios
   - Multiple variants: inline, card, minimal
   - Specialized prompts for video interactions, zapping, commenting

4. **useLoginPrompt Hook** (`src/hooks/useLoginPrompt.ts`)
   - Centralized login checking logic
   - Follows Jumble's `withLoginCheck` pattern
   - Provides feature capability checking

## User Experience Flow

### Content Access Strategy

| Feature | Not Logged In | Read-Only Mode | Fully Authenticated |
|---------|---------------|----------------|-------------------|
| Browse Videos | ✅ | ✅ | ✅ |
| View Profiles | ✅ | ✅ | ✅ |
| Share QR Codes | ✅ | ✅ | ✅ |
| Post Videos | ❌ | ❌ | ✅ |
| Comment | ❌ | ❌ | ✅ |
| Like/React | ❌ | ❌ | ✅ |
| Send Zaps | ❌ | ❌ | ✅ |
| Follow Users | ❌ | ❌ | ✅ |
| Enhanced Sharing | ❌ | ❌ | ✅ |

### Progressive Authentication

1. **Immediate Access**: Users can start browsing videos immediately
2. **Value Demonstration**: Show app functionality before requiring login
3. **Gentle Prompts**: Encourage login through demonstrated value, not barriers
4. **Smart Feature Gating**: Only restrict actions that require authentication

## Implementation Details

### Updated Components

#### CommentsModal
- Shows read-only prompts instead of login forms
- Hides interactive buttons for read-only users
- Maintains full comment viewing functionality

#### VideoActionButtons
- Uses `withLoginCheck` for all interactive actions
- Provides contextual login prompts
- Preserves button visibility with appropriate messaging

#### ZapButton
- Graceful degradation for read-only users
- Toast notifications for login requirements
- Maintains zap count display without interaction

#### LoginArea
- Added browse without login option
- Enhanced with `showBrowseWithoutLogin` prop
- Maintains existing functionality

### Login Prompt Variants

#### VideoInteractionPrompt
```tsx
<VideoInteractionPrompt onLoginClick={() => openLoginModal()} />
```
- For general video interactions (like, comment, share)
- Inline variant with call-to-action

#### VideoPostingPrompt
```tsx
<VideoPostingPrompt onLoginClick={() => openLoginModal()} />
```
- For encouraging content creation
- Card variant with prominent positioning

#### ZapPrompt
```tsx
<ZapPrompt onLoginClick={() => openLoginModal()} />
```
- Specifically for Bitcoin zapping features
- Emphasizes creator support aspect

#### CommentPrompt
```tsx
<CommentPrompt onLoginClick={() => openLoginModal()} />
```
- Minimal variant for comment sections
- Subtle encouragement to join discussions

### Hook Usage Patterns

#### useLoginPrompt
```typescript
const { withLoginCheck, canPerformAction } = useLoginPrompt();

// Check if user can perform an action
if (canPerformAction('post')) {
  // User can post
} else {
  // Show login prompt
}

// Execute action with login check
await withLoginCheck(async () => {
  // Action that requires authentication
}, {
  loginMessage: 'Login required to post videos',
  onLoginRequired: () => openLoginModal()
});
```

#### Enhanced useCurrentUser
```typescript
const { 
  user, 
  canSign, 
  isReadOnly, 
  isAuthenticated, 
  checkLogin 
} = useCurrentUser();

// Check capabilities
if (canSign) {
  // User can perform write operations
} else if (isReadOnly) {
  // User is in read-only mode
} else {
  // User is not logged in at all
}
```

## Jumble Patterns Adopted

### 1. Progressive Authentication
- `checkLogin()` function pattern for conditional execution
- Read-only signer concept for partial functionality
- Graceful degradation of features

### 2. User Experience Patterns
- "Login to set" messaging for settings
- "Please login to view following feed" for restricted content
- Conditional UI rendering based on authentication state

### 3. Feature Gating Strategy
- Read operations always accessible
- Write operations require authentication
- Smart prompts instead of hard blocks

### 4. Authentication Architecture
- Multi-signer system with read-only support
- Conditional feature access patterns
- User state management with capability detection

## Demo and Testing

### ReadOnlyModeDemo Component
Available at `/read-only-demo` route for testing and demonstration:

- **User State Display**: Shows current authentication status
- **Available Actions**: Displays capability matrix
- **Feature Matrix**: Comprehensive table of feature availability
- **Interactive Testing**: Toggle read-only mode for testing
- **Login Prompts**: Preview of all login prompt variants

### Testing the Implementation

1. **Navigate to `/read-only-demo`** to see the feature overview
2. **Enable read-only demo mode** to test restricted functionality
3. **Try interactive features** to see login prompts
4. **Test video browsing** without authentication
5. **Verify prompt behavior** across different components

## Migration and Deployment

### Backward Compatibility
- All existing functionality preserved
- No breaking changes to current user flows
- Enhanced capabilities added progressively

### Configuration Options
- `showBrowseWithoutLogin` prop for LoginArea
- Customizable prompt messages and actions
- Flexible login prompt variants

### Performance Considerations
- No additional bundle size for read-only functionality
- Lazy loading of login components
- Minimal overhead for capability checking

## Future Enhancements

### Potential Improvements
1. **Analytics**: Track read-only user engagement
2. **A/B Testing**: Test different login encouragement strategies
3. **Feature Previews**: Show authenticated features as previews
4. **Social Proof**: Display interaction counts to encourage participation
5. **Onboarding**: Guided tours for new users

### Integration Points
- **NIP-05 Support**: Show verified profile previews
- **Lightning Integration**: Preview zap amounts and creator earnings
- **Content Discovery**: Enhanced algorithms for non-authenticated users
- **Share Optimization**: Better sharing for viral growth

## Best Practices

### Do's
- Always provide value before requesting authentication
- Use descriptive error messages that explain benefits
- Maintain full browsing functionality for all users
- Show interaction counts and engagement metrics
- Provide clear paths to authentication

### Don'ts
- Don't block content viewing with login walls
- Don't hide valuable features without explanation
- Don't make login prompts overly aggressive
- Don't break existing user workflows
- Don't compromise app performance for new features

This implementation provides a solid foundation for ZapTok's read-only mode while maintaining the flexibility to evolve based on user feedback and usage patterns.