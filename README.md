# Editor Switcher

[![CI](https://github.com/mikejhill/vscode-editor-switcher/actions/workflows/ci.yml/badge.svg)](https://github.com/mikejhill/vscode-editor-switcher/actions/workflows/ci.yml)
[![Release](https://github.com/mikejhill/vscode-editor-switcher/actions/workflows/release.yml/badge.svg)](https://github.com/mikejhill/vscode-editor-switcher/actions/workflows/release.yml)

Quickly move between open editors with a QuickPick that also lets you close the highlighted editor without leaving the list.

## Features

- Lists open editors per group with icons, dirty markers, and separators by group.
- Type to filter, press Enter to switch, or use your close keybinding to close the highlighted editor while the picker stays open.
- Includes a close button on each item for mouse users.
- Respects existing VS Code commands for opening/closing tabs so it works across file types and groups.

## Commands

- Editor Switcher: Open (`editorSwitcher.open`)
- Editor Switcher: Close highlighted editor (`editorSwitcher.closeSelected`)

## Default keybindings

- Open picker: `Ctrl+Alt+E`
- Close highlighted (while picker is open): `Ctrl+W`

## Requirements

No additional requirements.

## Known issues

None known at this time.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Important:** All pull requests that change functionality must include updates to [CHANGELOG.md](CHANGELOG.md) following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.
