<!-- markdownlint-disable MD024: Allow duplicate headings -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add `editor-switcher.onCloseKeepGroupFocus` setting to keep selection in the same editor group after closing from the picker when possible. If true, the quick pick dialog selection will try to stay on the nearest tab in the same group; otherwise, it will move between groups based on the extension’s tab selection strategy.
- Add `editor-switcher.onCloseSelectTabStrategy` setting to control which tab is selected after closing a highlighted tab via the quick pick dialog (options: "selectNext" or "selectPrevious"). This only affects the quick pick dialog and does not impact built-in editor tab selection if the closed tab was active.
- Changed extension ID, commands, and configurations to all use the key `editor-switcher`.
- Localize titles and descriptions for new close-behavior settings across bundled language packs.
- Add comprehensive unit and integration tests for new settings and selection behavior
- Improve existing test assertions for increased reliability

## [1.0.2]

### Internal

- CI changes only. Updated release workflow to use explicit VSIX filename for marketplace publishing

## [1.0.1]

### Fixed

- `package.nls.json` localization files now correctly included in VSIX packages

## [1.0.0]

### Added

Initial release:

- Default keybindings: Ctrl+Alt+E to open picker, Ctrl+W to close selected editor
- Quick picker to list and switch between open editors with file icons
- Close highlighted editor from the picker without leaving it
- Dirty markers for unsaved files
- Visual separators between editor groups
- Close button on picker items for mouse users
- Core commands: editor-switcher.open, editor-switcher.closeSelected
- Integration tests for end-to-end functionality

[Unreleased]: https://github.com/mikejhill/vscode-editor-switcher/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/mikejhill/vscode-editor-switcher/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/mikejhill/vscode-editor-switcher/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/mikejhill/vscode-editor-switcher/releases/tag/v1.0.0
