# Prettier Formatting Roadmap

## Overview

This roadmap outlines the incremental adoption of Prettier formatting across the ZapTok codebase. The goal is to maintain clean git history while gradually standardizing code formatting for better collaboration.

## Strategy

- **Incremental Approach**: Format one directory at a time
- **Small Commits**: Each phase formats 30-80 files to keep diffs reviewable
- **Tie to Development**: Format directories as you actively work on them
- **No Rush**: Complete over weeks/months as natural part of development

## Current Status

- ✅ **Phase 0**: Prettier setup complete
  - `.prettierrc` configuration added
  - `.prettierignore` configured
  - npm scripts added: `npm run format` and `npm run format:check`
  - Prettier installed as dev dependency

## Formatting Phases

### Phase 1: Core Authentication & User Management
**Files**: ~80 files | **Estimated Time**: 3 seconds

**Directories:**
- `src/components/auth/` (19 files)
- `src/hooks/` - auth-related hooks only (useCurrentUser, useLoginActions, useLoggedInAccounts)
- `src/providers/` (NostrLoginProvider, etc.)

**Command:**
```bash
npx prettier --write "src/components/auth/**/*.{ts,tsx}" "src/providers/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to auth components and providers"
```

**Rationale**: Start with authentication - critical, well-tested, stable code.

---

### Phase 2: UI Components Library
**Files**: ~90 files | **Estimated Time**: 3 seconds

**Directories:**
- `src/components/ui/` (48 shadcn/ui components)
- `src/components/debug/` (developer tools)

**Command:**
```bash
npx prettier --write "src/components/ui/**/*.{ts,tsx}" "src/components/debug/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to UI components and debug tools"
```

**Rationale**: UI components are self-contained, minimal cross-dependencies.

---

### Phase 3: Lightning & Payment Components
**Files**: ~40 files | **Estimated Time**: 2 seconds

**Directories:**
- `src/components/lightning/` (Cashu wallet, nutzaps, etc.)
- `src/components/donation/` (donation features)
- Related hooks (useNutzaps, useCashuWallet, useZapPayment, etc.)

**Command:**
```bash
npx prettier --write "src/components/lightning/**/*.{ts,tsx}" "src/components/donation/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to payment components"
```

**Rationale**: Group payment-related code together for consistency.

---

### Phase 4: Video Components & Player
**Files**: ~35 files | **Estimated Time**: 2 seconds

**Directories:**
- `src/components/video/` (video player, controls, overlay)
- `src/components/stream/` (streaming features)
- Video-related hooks (useOptimizedGlobalVideoFeed, useVideoUpload, etc.)

**Command:**
```bash
npx prettier --write "src/components/video/**/*.{ts,tsx}" "src/components/stream/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to video and streaming components"
```

**Rationale**: Core feature - video playback and streaming.

---

### Phase 5: Social Features (Comments, Users, Profiles)
**Files**: ~45 files | **Estimated Time**: 2 seconds

**Directories:**
- `src/components/comments/` (NIP-22 threaded comments)
- `src/components/users/` (user cards, follow buttons, etc.)
- `src/components/profile/` (profile pages, edit forms)
- Related hooks (useComments, usePostComment, useAuthor, etc.)

**Command:**
```bash
npx prettier --write "src/components/comments/**/*.{ts,tsx}" "src/components/users/**/*.{ts,tsx}" "src/components/profile/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to social features (comments, users, profiles)"
```

**Rationale**: Social interaction components.

---

### Phase 6: Settings & Configuration
**Files**: ~25 files | **Estimated Time**: 1 second

**Directories:**
- `src/components/settings/` (relay config, developer settings, etc.)
- `src/config/` (app configuration)
- `src/constants/` (constants and configs)

**Command:**
```bash
npx prettier --write "src/components/settings/**/*.{ts,tsx}" "src/config/**/*.{ts,tsx}" "src/constants/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to settings and configuration"
```

**Rationale**: Configuration and settings pages.

---

### Phase 7: Services & Business Logic
**Files**: ~35 files | **Estimated Time**: 2 seconds

**Directories:**
- `src/services/` (timelineService, lightning.service, blossom-upload.service, etc.)
- `src/stores/` (Zustand stores - nutzapStore, cashuStore, etc.)

**Command:**
```bash
npx prettier --write "src/services/**/*.{ts,tsx}" "src/stores/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to services and stores"
```

**Rationale**: Business logic and state management.

---

### Phase 8: Utilities & Helpers
**Files**: ~30 files | **Estimated Time**: 2 seconds

**Directories:**
- `src/lib/` (utility functions, helpers, validators)
- `src/types/` (TypeScript type definitions)

**Command:**
```bash
npx prettier --write "src/lib/**/*.{ts,tsx}" "src/types/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to utilities and type definitions"
```

**Rationale**: Foundational utilities and types.

---

### Phase 9: Pages & Routing
**Files**: ~20 files | **Estimated Time**: 1 second

**Directories:**
- `src/pages/` (Index, Profile, FAQ, Settings, etc.)
- `AppRouter.tsx`, `App.tsx`

**Command:**
```bash
npx prettier --write "src/pages/**/*.{ts,tsx}" "src/App*.tsx"
git add -A
git commit -m "chore(format): apply prettier to pages and routing"
```

**Rationale**: Top-level app structure.

---

### Phase 10: Remaining Hooks
**Files**: ~50 files | **Estimated Time**: 2 seconds

**Directories:**
- `src/hooks/` (all remaining hooks not yet formatted)

**Command:**
```bash
npx prettier --write "src/hooks/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to remaining hooks"
```

**Rationale**: Complete hook formatting.

---

### Phase 11: Remaining Components & Cleanup
**Files**: ~50 files | **Estimated Time**: 2 seconds

**Directories:**
- Any remaining components in `src/components/`
- Root-level component files

**Command:**
```bash
npx prettier --write "src/components/**/*.{ts,tsx}"
git add -A
git commit -m "chore(format): apply prettier to remaining components"
```

**Rationale**: Complete component formatting.

---

### Phase 12: Tests & CSS
**Files**: ~30 files | **Estimated Time**: 2 seconds

**Directories:**
- `src/test/` (test utilities, test files)
- `src/**/*.css` (stylesheets)

**Command:**
```bash
npx prettier --write "src/test/**/*.{ts,tsx}" "src/**/*.css"
git add -A
git commit -m "chore(format): apply prettier to tests and styles"
```

**Rationale**: Test files and styles - low risk, high value.

---

## Completion Checklist

After completing all phases, verify formatting:

```bash
# Should show no warnings
npm run format:check
```

---

## Tips for Success

### 1. Format Before Major Changes
Before making significant updates to a directory, format it first:
```bash
npx prettier --write "src/components/auth/**/*.{ts,tsx}"
git commit -m "chore(format): prettier auth components"
# Then make your feature changes in a separate commit
```

### 2. VS Code Integration
Add to `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### 3. Pre-commit Hook (Optional)
Install husky for automatic formatting:
```bash
npx husky-init
npx husky add .husky/pre-commit "npm run format:check"
```

### 4. CI/CD Integration
Add to GitHub Actions workflow:
```yaml
- name: Check formatting
  run: npm run format:check
```

---

## Timeline Estimates

**Aggressive**: 1-2 weeks (complete all phases quickly)
**Moderate**: 1-2 months (1-2 phases per week)
**Relaxed**: 2-3 months (format as you work on code)

**Recommended**: **Moderate approach** - format directories as you actively work on them.

---

## Maintenance After Completion

Once all phases are complete:

1. **CI/CD**: Add `npm run format:check` to test script
2. **Documentation**: Update CONTRIBUTING.md with Prettier requirements
3. **Onboarding**: New contributors run `npm run format` before committing
4. **Pre-commit**: Optional husky hook for automatic formatting

---

## Progress Tracking

Mark phases as complete:

- [ ] Phase 1: Core Authentication & User Management
- [ ] Phase 2: UI Components Library
- [ ] Phase 3: Lightning & Payment Components
- [ ] Phase 4: Video Components & Player
- [ ] Phase 5: Social Features
- [ ] Phase 6: Settings & Configuration
- [ ] Phase 7: Services & Business Logic
- [ ] Phase 8: Utilities & Helpers
- [ ] Phase 9: Pages & Routing
- [ ] Phase 10: Remaining Hooks
- [ ] Phase 11: Remaining Components & Cleanup
- [ ] Phase 12: Tests & CSS

**Total Estimated Time**: ~25 seconds of actual formatting
**Total Estimated Calendar Time**: 1-3 months (with natural development flow)

---

## Notes

- Each phase is independent - complete in any order
- Skip phases for code you're actively refactoring (format after changes)
- Large diffs are okay - they're pure formatting, easy to review
- Don't mix formatting with logic changes - separate commits!

---

**Last Updated**: October 8, 2025
**Status**: Phase 0 Complete (Setup)
**Next Phase**: Phase 1 (Auth & User Management) - whenever convenient
