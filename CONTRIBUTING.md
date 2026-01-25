# Contributing to Editor Switcher

Thank you for your interest in contributing to Editor Switcher! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Be respectful and professional in all interactions.

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in the [Issues](https://github.com/mikejhill/vscode-editor-switcher/issues)
- If not, create a new issue with a clear title and description
- Include steps to reproduce, expected behavior, and actual behavior
- Include your VS Code version and operating system

### Suggesting Enhancements

- Check if the enhancement has already been suggested
- Create a new issue with a clear description of the proposed feature
- Explain why this enhancement would be useful

### Pull Requests

1. Fork the repository
2. Create a new branch from `main` for your changes
3. Make your changes following the code style of the project
4. **Update CHANGELOG.md** (see below)
5. Test your changes thoroughly
6. Commit your changes with clear, descriptive commit messages
7. Push to your fork and submit a pull request

## Updating the CHANGELOG

**This is required for all pull requests that change functionality.**

We follow [Keep a Changelog](https://keepachangelog.com/) format. All notable changes must be documented in [CHANGELOG.md](CHANGELOG.md).

### When to Update the CHANGELOG

Update the CHANGELOG for:

- New features
- Bug fixes
- Breaking changes
- Deprecations
- Security fixes
- Performance improvements
- Any user-visible changes

Do NOT update the CHANGELOG for:

- Documentation-only changes (unless they fix incorrect docs)
- Internal refactoring with no user impact
- Changes to tests or build configuration

### How to Update the CHANGELOG

1. Add your changes under the `[Unreleased]` section
2. Use the appropriate subsection:
   - `Added` - for new features
   - `Changed` - for changes in existing functionality
   - `Deprecated` - for soon-to-be removed features
   - `Removed` - for removed features
   - `Fixed` - for bug fixes
   - `Security` - for vulnerability fixes
3. Write clear, user-focused descriptions
4. Start each entry with a verb (e.g., "Add", "Fix", "Update")
5. Include issue/PR numbers when applicable

#### Example

```markdown
## [Unreleased]

### Added

- New command to reopen recently closed editors (#123)

### Fixed

- Editor picker now correctly shows icons for custom file types (#124)

### Changed

- Improved performance when listing large number of editors (#125)
```

### CHANGELOG Format Rules

- Keep entries clear and concise
- Group similar changes together
- Most important changes should be listed first in each category
- Use present tense ("Add feature" not "Added feature")
- Reference issues and PRs where applicable
- When a version is released, the Unreleased section is moved to a dated version

## Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Open in VS Code
4. Press F5 to launch the Extension Development Host
5. Make changes and test in the development instance

## Testing

- Run tests with `npm test`
- Ensure all tests pass before submitting a PR
- Add tests for new functionality when applicable

## Code Style

- Follow the existing code style
- Use TypeScript
- Run `npm run lint` to check for linting errors
- Run `npm run check-types` to verify TypeScript types

## Questions?

Open an issue for any questions about contributing.
