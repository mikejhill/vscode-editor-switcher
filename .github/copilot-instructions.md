# Copilot Instructions for vscode-editor-switcher

## CHANGELOG Requirements

**CRITICAL: Always update CHANGELOG.md when making functional changes.**

This repository follows [Keep a Changelog](https://keepachangelog.com/).

### When to Update CHANGELOG.md

Update CHANGELOG.md for ALL of the following:

- New features or commands
- Bug fixes
- Breaking changes
- Deprecations
- Security fixes
- Performance improvements
- User-visible changes of any kind

Do NOT update for:

- Documentation-only changes
- Internal refactoring with no user impact
- Test changes
- Build configuration changes

### How to Update CHANGELOG.md

1. Add new entries under `[Unreleased]` section
2. Use appropriate category heading:
   - `### Added` - new features
   - `### Changed` - changes in existing functionality
   - `### Deprecated` - soon-to-be removed features
   - `### Removed` - removed features
   - `### Fixed` - bug fixes
   - `### Security` - vulnerability fixes

3. Format rules:
   - Start with a verb (Add, Fix, Update, Remove, etc.)
   - Be clear and user-focused
   - Include issue/PR numbers when applicable: (#123)
   - Add blank line after section heading
   - No blank lines between bullets
   - Ensure file ends with single newline

### Example Format

```markdown
## [Unreleased]

### Added

- New command to show recently closed editors (#123)

### Fixed

- Editor icons now display correctly for all file types (#124)
```

## Code Style

- Follow existing TypeScript patterns
- Use VS Code API idiomatically
- Add JSDoc comments for public functions
- Run `npm run lint` and `npm run check-types` before suggesting completion

## Testing

- Suggest test additions for new functionality
- Ensure tests cover edge cases
- Reference existing test patterns in `src/test/`

## Commit Messages

Suggest clear, descriptive commit messages that explain the "why" not just the "what".

## References

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full contribution guidelines.
