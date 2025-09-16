# Contributing to ZapTok

Thank you for your interest in contributing to ZapTok! 

ZapTok is an open-source, decentralized short-form video platform built on Nostr, and we welcome contributions from developers, creators, and community members who share our vision of self-sovereignty, creator-first economics, and censorship resistance.

## Table of Contents

- [Philosophy & Values](#philosophy--values)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Guidelines](#development-guidelines)
- [Nostr Protocol Integration](#nostr-protocol-integration)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Code Style](#code-style)
- [Testing](#testing)
- [Community](#community)
- [Recognition](#recognition)

## Philosophy & Values

Before contributing, please familiarize yourself with ZapTok's core principles:

- **Self sovereignty**: Users own their data, identity, and monetary interactions
- **Creator-first economy**: Zero platform fees, direct monetization
- **Interoperability**: Seamless integration with other Nostr apps
- **Open source**: Transparent, auditable code
- **Privacy by design**: Built-in privacy protections
- **Censorship resistance**: Decentralized architecture with no single point of failure

All contributions should align with and advance these values.

## Ways to Contribute

### Code Contributions
- **Bug fixes**: Fix issues and improve stability
- **Feature development**: Implement new features from our [roadmap](README.md#phase-1-foundation-completed-)
- **Performance improvements**: Optimize video loading, caching, and overall app performance
- **Nostr protocol integration**: Implement new NIPs or improve existing implementations
- **Mobile/PWA enhancements**: Improve mobile experience and Progressive Web App functionality

### Documentation
- **Developer documentation**: API guides, architecture documentation
- **User guides**: Help documentation for creators and viewers
- **NIP implementation guides**: Document Nostr protocol integrations
- **Tutorial content**: Video guides, blog posts, examples

### Design & UX
- **UI/UX improvements**: Enhance user interface and experience
- **Accessibility**: Improve accessibility for users with disabilities
- **Mobile optimization**: Better mobile layouts and interactions
- **Creator tools**: Design intuitive monetization and content management interfaces

### Testing & Quality Assurance
- **Manual testing**: Test new features and report bugs
- **Automated testing**: Write unit, integration, and end-to-end tests
- **Cross-platform testing**: Test on different devices and browsers
- **Performance testing**: Load testing, stress testing

### Community
- **Community management**: Help moderate discussions and answer questions
- **Content creation**: Create educational content about ZapTok and Nostr
- **User support**: Help users in community forums and support channels
- **Translation**: Localization for international users (future)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Basic understanding of React, TypeScript, and web development
- Familiarity with Bitcoin/Lightning Network concepts (helpful)
- Understanding of Nostr protocol (helpful, but not required)

### Fork and Clone
1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ZapTok.git
   cd ZapTok
   ```

3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/silentius-satoshi/ZapTok.git
   ```

## Development Setup

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

### Environment Setup
1. Copy `.env.example` to `.env` (if it exists)
2. Configure any necessary environment variables
3. For local development, the app should work without additional setup

## Development Guidelines

### Branch Naming
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/component-name` - Code refactoring
- `test/test-description` - Test additions

### Commit Messages
Use conventional commit format:
```
type(scope): description

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions
- `chore`: Maintenance tasks

Examples:
```
feat(zaps): implement NIP-57 lightning zaps
fix(video): resolve playback issue on mobile Safari
docs(contributing): add development setup instructions
```

## Nostr Protocol Integration

ZapTok is built on the Nostr protocol. When contributing Nostr-related features:

### NIP Implementation Guidelines
1. **Research existing NIPs**: Check our [NIP implementation status](README.md#full-nip-implementation-status) before implementing
2. **Follow specifications**: Implement NIPs according to their official specifications
3. **Interoperability**: Ensure compatibility with other Nostr clients
4. **Documentation**: Document any custom extensions or variations

### Key Nostr Concepts
- **Events**: All content and interactions are Nostr events
- **Keys**: Users control their identity through cryptographic keys
- **Relays**: Decentralized servers that store and distribute events
- **NIPs**: Nostr Implementation Possibilities (protocol specifications)

### Current NIP Integrations
See our [README](README.md#full-nip-implementation-status) for a complete list of implemented and planned NIPs.

## Pull Request Process

### Before Submitting
1. **Check existing issues**: Look for related issues or discussions
2. **Create an issue**: For large features, create an issue first to discuss
3. **Update your branch**: Rebase against the latest main branch
4. **Test your changes**: Ensure all tests pass and manually test functionality
5. **Update documentation**: Update relevant documentation and comments

### PR Checklist
- [ ] Code follows our style guidelines
- [ ] Tests pass locally (`npm run test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Changes are documented (README, comments, etc.)
- [ ] Breaking changes are clearly documented
- [ ] Related issues are referenced

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
- [ ] Manual testing completed
- [ ] Automated tests added/updated
- [ ] Cross-browser testing completed

## Screenshots (if applicable)
Before/after screenshots for UI changes

## Additional Notes
Any additional context or considerations
```

## Issue Guidelines

### Before Creating an Issue
1. **Search existing issues**: Check if the issue already exists
2. **Check documentation**: Review README and other docs
3. **Reproduce the bug**: For bug reports, provide clear reproduction steps

### Issue Types
- **Bug Report**: Something isn't working correctly
- **Feature Request**: New functionality or enhancement
- **Question**: Need help or clarification
- **Documentation**: Improvements to documentation

### Issue Templates
Please use our issue templates when available, or include:
- **Clear title**: Descriptive and specific
- **Environment**: Browser, device, OS version
- **Steps to reproduce**: For bugs, clear reproduction steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots**: If applicable

## Code Style

### TypeScript & JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Prefer functional components and hooks

### React Guidelines
- Use functional components with hooks
- Follow React best practices
- Use proper TypeScript types
- Implement proper error boundaries
- Optimize for performance (useMemo, useCallback when needed)

### CSS & Styling
- Use Tailwind CSS for styling
- Follow responsive design principles
- Use semantic HTML elements
- Ensure accessibility (ARIA labels, keyboard navigation)
- Test on mobile devices

### File Organization
```
src/
├── components/     # Reusable UI components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and helpers
├── pages/         # Page components
├── contexts/      # React context providers
├── stores/        # State management
└── types/         # TypeScript type definitions
```

## Testing

### Test Requirements
- **Unit tests**: For utility functions and hooks
- **Component tests**: For React components
- **Integration tests**: For feature workflows
- **E2E tests**: For critical user paths (when applicable)

### Testing Guidelines
- Write tests for new features
- Update tests when modifying existing code
- Use meaningful test descriptions
- Test edge cases and error conditions
- Mock external dependencies appropriately

### Running Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Community

### Communication Channels
- **GitHub Issues**: Bug reports, feature requests, and discussions
- **GitHub Discussions**: General questions and community chat
- **Chorus Community**: [chorus.community/zaptok](https://chorus.community/group/34550%3A8b12bddc423189c660156eab1ea04e1d44cc6621c550c313686705f704dda895%3Azaptok-mdgpgdbb)
- **Nostr**: Follow #ZapTok tag for updates

### Code of Conduct
- **Be respectful**: Treat all community members with respect
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone is learning
- **Stay on topic**: Keep discussions relevant to ZapTok
- **Follow platform rules**: Respect GitHub's terms of service

## Recognition

### Contributors
All contributors are recognized in our [README](README.md#acknowledgments--credits) and will be added to our contributors list.

### Types of Recognition
- **Code contributors**: Listed in GitHub contributors
- **Community contributors**: Recognized in community channels
- **Major contributors**: Featured in README acknowledgments
- **Lightning tips**: Receive Bitcoin tips from community members

### Bitcoin Tips for Contributors
Active contributors may receive Bitcoin tips (zaps) from:
- Community members appreciating their work
- Core team members for significant contributions
- Creator revenue sharing (for major contributors)

---

## Questions?

If you have questions about contributing:
1. Check our [README](README.md) and documentation
2. Search existing GitHub issues and discussions
3. Create a new issue with the "question" label
4. Ask in our [Chorus community](https://chorus.community/group/34550%3A8b12bddc423189c660156eab1ea04e1d44cc6621c550c313686705f704dda895%3Azaptok-mdgpgdbb)

---

<div align="center">

**Thank you for contributing to ZapTok!**

*Building the future of creator economy, one commit at a time.*

</div>