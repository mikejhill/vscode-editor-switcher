import * as vscode from "vscode";
import * as path from "path";
import { FileIconService } from "./fileIconService";
import { ILogger } from "./logService";

/**
 * Represents a tab item in the quick pick list.
 * Extends QuickPickItem with tab and group references.
 */
export type TabItem = vscode.QuickPickItem & {
  __tab?: vscode.Tab;
  __group: vscode.TabGroup;
};

/**
 * Manages tab selection and interaction via a quick pick interface.
 * Handles displaying tabs, opening, closing, and maintaining selection state.
 */
export class TabManager {
  private activeQuickPick: vscode.QuickPick<TabItem> | undefined;
  private static commandDisposables: vscode.Disposable[] = [];

  constructor(
    private readonly iconService: FileIconService,
    private readonly log: ILogger,
  ) {}

  private static disposeCommands(): void {
    TabManager.commandDisposables.forEach((d) => d.dispose());
    TabManager.commandDisposables = [];
  }

  /**
   * Sets a VS Code context variable for use in keybindings and when clauses.
   */
  private async setContext(key: string, value: unknown): Promise<void> {
    await vscode.commands.executeCommand("setContext", key, value);
  }

  /**
   * Extracts the URI from various tab input types.
   */
  private extractUri(tab: vscode.Tab): vscode.Uri | undefined {
    const input = tab.input as any;
    return input?.uri ?? input?.modified ?? input?.original ?? undefined;
  }

  /**
   * Gets a stable identifier for a tab based on its URI, label, and group.
   * Used to compare tabs across refresh cycles when object references change.
   * Includes group viewColumn to distinguish the same file open in different groups.
   */
  private getTabIdentifier(tab: vscode.Tab, group: vscode.TabGroup): string {
    const uri = this.extractUri(tab)?.fsPath ?? "";
    const label = tab.label;
    const groupColumn = group.viewColumn?.toString() ?? "";
    return `${uri}|${label}|${groupColumn}`;
  }

  /**
   * Builds a label with status icons for a tab (active indicator, dirty indicator).
   */
  private buildTabLabel(tab: vscode.Tab): string {
    const icons: string[] = [];
    if (tab.isActive) {
      icons.push("$(target)");
    }
    if (tab.isDirty) {
      icons.push("$(primitive-dot)");
    }
    return `${tab.label} ${icons.join("")}`.trim();
  }

  /**
   * Builds the description (directory path) for a tab item.
   */
  private buildTabDescription(
    uri: vscode.Uri | undefined,
    tabLabel: string,
  ): string {
    if (!uri?.fsPath) {
      return "";
    }

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const dir = path.dirname(relativePath);

    // Only show directory if it's meaningful (not root and not same as filename)
    if (dir && dir !== "." && relativePath !== tabLabel) {
      return dir;
    }

    return "";
  }

  /**
   * Converts a VS Code tab to a QuickPickItem for display.
   */
  private tabToItem(
    group: vscode.TabGroup,
    tab: vscode.Tab,
    isFirstInGroup: boolean,
  ): TabItem {
    const uri = this.extractUri(tab);
    const label = this.buildTabLabel(tab);
    const description = this.buildTabDescription(uri, tab.label);

    return {
      label,
      resourceUri: uri,
      description,
      iconPath: this.iconService.inferTabIcon(tab),
      buttons: [
        {
          iconPath: new vscode.ThemeIcon("close"),
          tooltip: vscode.l10n.t("Close Editor"),
        },
      ],
      __tab: tab,
      __group: group,
    };
  }

  /**
   * Builds the complete list of items for the quick pick,
   * organized by tab groups with separators.
   */
  private buildItems(): TabItem[] {
    const items: TabItem[] = [];
    const sortedGroups = this.getSortedTabGroups();

    for (const group of sortedGroups) {
      this.addGroupSeparator(items, group);
      this.addGroupTabs(items, group);
    }

    return items;
  }

  /**
   * Returns all tab groups sorted by view column.
   */
  private getSortedTabGroups(): vscode.TabGroup[] {
    return [...vscode.window.tabGroups.all].sort((a, b) => {
      const aLabel = a.viewColumn?.toString() || "";
      const bLabel = b.viewColumn?.toString() || "";
      return aLabel.localeCompare(bLabel);
    });
  }

  /**
   * Adds a group separator item to the list if the group has tabs.
   */
  private addGroupSeparator(items: TabItem[], group: vscode.TabGroup): void {
    if (group.tabs.length > 0) {
      items.push({
        label: `Group ${group.viewColumn}`,
        kind: vscode.QuickPickItemKind.Separator,
        __tab: undefined,
        __group: group,
      });
    }
  }

  /**
   * Adds all tabs from a group to the items list.
   */
  private addGroupTabs(items: TabItem[], group: vscode.TabGroup): void {
    for (let i = 0; i < group.tabs.length; i++) {
      const tab = group.tabs[i];
      const isFirstInGroup = i === 0;
      items.push(this.tabToItem(group, tab, isFirstInGroup));
    }
  }

  /**
   * Focuses a specific editor group using built-in workbench commands.
   */
  private async focusGroup(group: vscode.TabGroup): Promise<void> {
    const column = group.viewColumn;
    if (!column) {
      return;
    }

    // Map column number to command name (1-8 supported directly)
    const groupNames = [
      "First",
      "Second",
      "Third",
      "Fourth",
      "Fifth",
      "Sixth",
      "Seventh",
      "Eighth",
    ];

    if (column <= 8) {
      // Use simple direct command for columns 1-8
      const command = `workbench.action.focus${groupNames[column - 1]}EditorGroup`;
      await vscode.commands.executeCommand(command);
    } else {
      // TODO: Any way to reach n-th group directly beyond 8?
      // No direct command to go to Nth group; first go to 8th group, then iterate group focus, checking after each step
      await vscode.commands.executeCommand(
        "workbench.action.focusEighthEditorGroup",
      );

      const maxIterations = vscode.window.tabGroups.all.length;
      let attempts = 0;
      let found = false;
      while (attempts < maxIterations) {
        const currentColumn =
          vscode.window.tabGroups.activeTabGroup?.viewColumn;
        if (currentColumn === column) {
          found = true;
          break;
        }
        // We hope that this increases the group number by 1, but unable to find any guarantee that this is the case
        await vscode.commands.executeCommand("workbench.action.focusNextGroup");
        attempts++;
      }

      if (!found) {
        throw new Error(
          `Failed to focus editor group ${column}: focusNextGroup did not reach the target group after ${maxIterations} iterations`,
        );
      }
    }
  }

  /**
   * Opens the tab represented by the given item.
   * Focuses the appropriate editor group and opens the file.
   */
  private async openTab(item: TabItem): Promise<void> {
    if (!item.__tab) {
      throw new Error("Failed to open tab: tab reference is undefined");
    }
    await this.focusGroup(item.__group);

    const tabIndex = item.__group.tabs.indexOf(item.__tab);
    if (tabIndex >= 0) {
      // Open by index
      const command = "workbench.action.openEditorAtIndex";
      await vscode.commands.executeCommand(command, tabIndex);
    } else {
      // Tab not found
      throw new Error(
        `Failed to open tab: tab not found in group ${item.__group.viewColumn}`,
      );
    }
  }

  /**
   * Refreshes the quick pick items while attempting to preserve the user's selection.
   * If the previously selected tab still exists, it remains selected.
   * Otherwise, selects a nearby item (preferring the previous neighbor).
   *
   * @param preferredActive - Optional item to prefer as the active selection
   */
  private refreshItemsPreservingSelection(preferredActive?: TabItem): void {
    if (!this.activeQuickPick) {
      return;
    }

    const previousItems = this.activeQuickPick.items;
    const activeBefore =
      preferredActive ?? this.activeQuickPick.activeItems?.[0];
    const activeIndex = activeBefore ? previousItems.indexOf(activeBefore) : -1;

    // Rebuild the item list with current state
    this.activeQuickPick.items = this.buildItems();

    if (!this.activeQuickPick.items.length) {
      return;
    }

    // Try to find and reselect the same tab if it still exists
    // Use stable tab identifier instead of object reference, since tab objects are recreated on refresh
    if (activeBefore) {
      if (!activeBefore.__tab) {
        this.log.warn(
          "Quick pick active item lost tab reference; skipping selection preservation",
        );
        return;
      }
      const activeTabId = this.getTabIdentifier(
        activeBefore.__tab,
        activeBefore.__group,
      );
      const sameTab = this.activeQuickPick.items.find(
        (item) =>
          item.__tab &&
          this.getTabIdentifier(item.__tab, item.__group) === activeTabId,
      );
      if (sameTab) {
        this.activeQuickPick.activeItems = [sameTab];
        return;
      }
    }

    // Fallback: select a nearby item, skipping separators
    const fallbackItem = this.findNearbyNonSeparatorItem(
      activeIndex,
      activeBefore,
    );
    if (fallbackItem) {
      this.activeQuickPick.activeItems = [fallbackItem];
    }
  }

  /**
   * Finds a non-separator item near the given index.
   * Prefers the next item in the same group if available,
   * otherwise falls back to the previous item in the same group.
   *
   * @param previousIndex - Index of the deleted item in the old list
   * @param deletedItem - The item that was deleted, to identify its group
   */
  private findNearbyNonSeparatorItem(
    previousIndex: number,
    deletedItem?: TabItem,
  ): TabItem | undefined {
    if (!this.activeQuickPick) {
      return undefined;
    }

    const items = this.activeQuickPick.items;
    const targetGroup = deletedItem?.__group;
    let result: TabItem | undefined;

    // Try to find the most stable item in the same group
    if (targetGroup && !result) {
      const groupItems = items
        .map((item, index) => ({ item, index }))
        .filter(
          ({ item, index }) =>
            item.kind !== vscode.QuickPickItemKind.Separator &&
            item.__group.viewColumn === targetGroup.viewColumn,
        );
      if (groupItems.length > 0) {
        const nearest = groupItems.reduce((closest, current) =>
          Math.abs(current.index - previousIndex) <
          Math.abs(closest.index - previousIndex)
            ? current
            : closest,
        );
        result = nearest.item;
      }
    }

    // Fallback: find the next non-separator item
    if (!result) {
      let newIndex = previousIndex;

      // Skip past any separators going forward
      while (
        newIndex < items.length &&
        items[newIndex]?.kind === vscode.QuickPickItemKind.Separator
      ) {
        newIndex++;
      }

      // If we passed the end, pick the last non-separator item
      if (newIndex >= items.length) {
        result = items
          .slice()
          .reverse()
          .find((item) => item?.kind !== vscode.QuickPickItemKind.Separator);
      } else {
        result = items[newIndex];
      }
    }

    return result;
  }

  /**
   * Closes the currently highlighted tab in the quick pick.
   * Maintains focus on the quick pick and selects a nearby tab.
   */
  private async closeHighlighted(): Promise<void> {
    if (!this.activeQuickPick) {
      return;
    }

    const item = this.activeQuickPick.activeItems?.[0];
    if (!item || !item.__tab) {
      return;
    }

    try {
      // Close without stealing focus from the picker
      await vscode.window.tabGroups.close(item.__tab, true);

      // Refresh and maintain a sensible selection
      this.refreshItemsPreservingSelection(item);
    } catch (error) {
      this.log.error("Failed to close highlighted tab", error);
    }
  }

  /**
   * Creates and configures the quick pick UI.
   */
  private createQuickPick(): vscode.QuickPick<TabItem> {
    const quickPick = vscode.window.createQuickPick<TabItem>();
    quickPick.placeholder =
      "Type to filter. Enter to switch. Use your close keybinding to close the highlighted editor.";
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.keepScrollPosition = true;
    return quickPick;
  }

  /**
   * Sets the initial active item in the quick pick to match the currently active tab.
   */
  private setInitialSelection(): void {
    if (!this.activeQuickPick) {
      return;
    }

    const activeTab = vscode.window.tabGroups.activeTabGroup?.activeTab;
    if (activeTab) {
      const activeItem = this.activeQuickPick.items.find(
        (item) => item.__tab === activeTab,
      );
      this.activeQuickPick.activeItems = activeItem ? [activeItem] : [];
    } else if (this.activeQuickPick.items.length) {
      this.activeQuickPick.activeItems = [this.activeQuickPick.items[0]];
    }
  }

  /**
   * Sets up event handlers for the quick pick.
   */
  private setupQuickPickHandlers(): void {
    if (!this.activeQuickPick) {
      return;
    }

    const hide = async () => {
      try {
        const qp = this.activeQuickPick;
        this.activeQuickPick = undefined;
        await this.setContext("editorSwitcherVisible", false);
        qp?.dispose();
      } catch (error) {
        this.log.error("Failed to hide quick pick", error);
      }
    };

    this.activeQuickPick.onDidHide(() => {
      void hide();
    });

    this.activeQuickPick.onDidAccept(() => {
      const item = this.activeQuickPick?.selectedItems?.[0];
      if (!item) {
        return;
      }

      void (async () => {
        try {
          await this.openTab(item);
          await hide();
        } catch (error) {
          this.log.error("Failed to open tab from quick pick", error);
        }
      })();
    });

    this.activeQuickPick.onDidTriggerItemButton((event) => {
      const highlighted = this.activeQuickPick?.activeItems?.[0];
      const tab = event.item.__tab;
      if (!tab) {
        return;
      }

      void (async () => {
        try {
          await vscode.window.tabGroups.close(tab, true);
          this.refreshItemsPreservingSelection(highlighted);
        } catch (error) {
          this.log.error("Failed to close tab from quick pick", error);
        }
      })();
    });

    // Optional: React to tab changes while picker is open
    const tabChangeDisposer = vscode.window.tabGroups.onDidChangeTabs(() => {
      if (!this.activeQuickPick) {
        return;
      }
      // TODO: Enable dynamic refresh; unclear if this is necessary or under what conditions; maybe if tab is closed externally?
      // this.refreshItemsPreservingSelection();
    });
    const commandsApi = vscode.commands as typeof vscode.commands & {
      onDidExecuteCommand?: (
        listener: (event: { command: string }) => void,
      ) => vscode.Disposable;
    };

    const closeQuickOpenDisposer: vscode.Disposable =
      commandsApi.onDidExecuteCommand?.((event) => {
        if (event.command === "workbench.action.closeQuickOpen") {
          this.activeQuickPick?.hide();
        }
      }) ?? {
        dispose: () => {
          // onDidExecuteCommand not available; nothing to dispose
        },
      };

    this.activeQuickPick.onDidHide(() => {
      tabChangeDisposer.dispose();
      closeQuickOpenDisposer.dispose();
    });
  }

  /**
   * Registers commands and activates the extension.
   */
  public activate(context: vscode.ExtensionContext): void {
    // Ensure previous registrations are cleaned up to avoid duplicate-command errors
    TabManager.disposeCommands();

    const openDisposable = vscode.commands.registerCommand(
      "editorSwitcher.open",
      async () => {
        try {
          await this.showQuickPick();
        } catch (error) {
          this.log.error("Failed to open editor switcher", error);
        }
      },
    );

    const closeDisposable = vscode.commands.registerCommand(
      "editorSwitcher.closeSelected",
      async () => {
        try {
          await this.closeHighlighted();
        } catch (error) {
          this.log.error("Failed to close highlighted tab", error);
        }
      },
    );

    TabManager.commandDisposables = [openDisposable, closeDisposable];
    context.subscriptions.push(...TabManager.commandDisposables);
  }

  /**
   * Displays the tab quick pick interface.
   */
  private async showQuickPick(): Promise<void> {
    // Dispose any existing picker
    this.activeQuickPick?.dispose();

    // Create and configure the quick pick
    const quickPick = this.createQuickPick();
    if (!quickPick) {
      return; // Defensive: VS Code should always return a quick pick
    }
    this.activeQuickPick = quickPick;
    this.activeQuickPick.items = this.buildItems();

    // Set initial selection
    this.setInitialSelection();

    // Set context for keybindings
    await this.setContext("editorSwitcherVisible", true);

    // Wire up event handlers
    this.setupQuickPickHandlers();

    // Show the picker
    this.activeQuickPick?.show();
  }

  /**
   * Cleans up resources when the extension is deactivated.
   */
  public deactivate(): void {
    this.activeQuickPick?.dispose();
    this.activeQuickPick = undefined;
    TabManager.disposeCommands();
  }
}
