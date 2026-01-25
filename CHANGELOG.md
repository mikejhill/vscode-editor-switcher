# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Refactored when condition tests to use VS Code extension integration tests instead of mocked APIs

### Added

- Quick picker to list and switch between open editors
- Close highlighted editor without leaving the picker
- File icons display in the editor list
- Dirty markers for unsaved files
- Visual separators between editor groups
- Close button on each item for mouse users
- Default keybinding: `Ctrl+Alt+E` to open picker
- Default keybinding: `Ctrl+W` to close highlighted editor while picker is open
- Command: `editorsQuickPick.open` - Open the editor switcher
- Command: `editorsQuickPick.closeSelected` - Close highlighted editor
