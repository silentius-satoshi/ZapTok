# UI Layout Guidelines

This document provides essential guidelines for implementing consistent and functional UI layouts across the ZapTok application.

## LoginArea Dropdown Layout Guidelines

**CRITICAL: LoginArea dropdown positioning requirements to prevent cutoff issues**

When working with the LoginArea component and its dropdown menu in the top-right corner of desktop layouts:

### 1. Container Width Requirements

Use `w-96` (384px) minimum width to accommodate full profile button with longer usernames:

```tsx
{/* Desktop Right Sidebar - Compact Login Area */}
<div className="hidden lg:block w-96 overflow-visible relative">
  <div className="sticky top-4 space-y-6 overflow-visible">
    <div className="p-3 overflow-visible relative">
      <LoginArea className="justify-end max-w-full" />
    </div>
  </div>
</div>
```

### 2. Container Overflow Settings

LoginArea containers must use `overflow-visible` to allow dropdown to extend beyond boundaries, with `relative` positioning for proper context.

### 3. Dropdown Configuration

DropdownMenuContent must have proper positioning and collision detection:

```tsx
<DropdownMenuContent 
  className='w-56 p-2 animate-scale-in' 
  align="end" 
  side="bottom" 
  sideOffset={8}
  avoidCollisions={true}
  collisionPadding={16}
  collisionBoundary={document.documentElement}
  sticky="always"
>
```

### 4. Main Layout Constraints

Keep main layout containers with `overflow-hidden` to prevent horizontal scrollbars:

```tsx
<div className="min-h-screen bg-black text-white overflow-hidden">
  <main className="h-screen overflow-hidden">
```

### Why This Matters

- **Profile Button Visibility**: `w-80` (320px) can cause profile button text to be cut off with longer usernames
- **Dropdown Positioning**: Without `overflow-visible` and proper collision detection, the dropdown gets clipped at viewport boundaries  
- **Portal Behavior**: The dropdown uses a Portal but still needs parent containers to allow overflow for proper positioning

### Implementation Requirements

**Apply this pattern to all pages**: Index.tsx, Profile.tsx, Global.tsx, Discover.tsx, About.tsx - anywhere LoginArea appears in the top-right desktop layout. Update all instances from `w-80` to `w-96`.

## Component Layout Best Practices

### Video Action Buttons

- **Desktop Sizing**: Use `h-12 w-12` to match mobile PWA version
- **Icon Standardization**: 28px icons across mobile and desktop platforms
- **Container Width**: `w-16` for proper spacing without overflow
- **Padding**: Remove unnecessary padding between video cards and action buttons

### Navigation Sidebar

- **Debug Controls**: Place VideoCacheDebug and Timeline Feed toggle in Navigation sidebar above wallet displays
- **Positioning**: Use relative positioning within sidebar structure rather than fixed positioning

### Responsive Design

- **Breakpoints**: Follow Tailwind's standard breakpoints (lg: 1024px+)
- **Mobile-First**: Design for mobile, enhance for desktop
- **Overflow Management**: Use `overflow-visible` only where dropdowns require it, maintain `overflow-hidden` for scroll containers

## Testing Guidelines

When implementing these layouts:

1. **Test with Long Usernames**: Verify profile buttons display fully with usernames of 20+ characters
2. **Viewport Edge Cases**: Test dropdown positioning near viewport boundaries
3. **Mobile Responsiveness**: Ensure layouts work across different screen sizes
4. **Scroll Behavior**: Verify no unintended horizontal scrollbars appear

## Maintenance Notes

- These guidelines prevent regression of layout fixes
- Always reference this document when working with LoginArea component
- Update this file when new layout patterns are established
- Test layout changes across all affected pages before committing