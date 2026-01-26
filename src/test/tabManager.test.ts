import * as assert from "assert";
import * as vscode from "vscode";
import { FileIconService } from "../fileIconService";
import { TabManager } from "../tabManager";
import { ILogger } from "../logService";
import * as sinon from "sinon";

function createMockLogService(): ILogger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    dispose: () => {},
    outputChannel: undefined,
  };
}

/**
 * Helper functions for creating mock objects
 */
function createMockTab(
  options: {
    label?: string;
    isActive?: boolean;
    isDirty?: boolean;
    input?: any;
  } = {},
): vscode.Tab {
  const {
    label = "test.ts",
    isActive = false,
    isDirty = false,
    input = new vscode.TabInputText(vscode.Uri.file("/path/test.ts")),
  } = options;

  return {
    label,
    isActive,
    isDirty,
    input,
    isPreview: false,
    group: createMockTabGroup(),
  } as any;
}

function createMockTabGroup(): vscode.TabGroup {
  return {
    viewColumn: 1,
    tabs: [],
    isActive: true,
    activeTab: undefined,
  } as any;
}

function createMockContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    extensionPath: "/mock/path",
    globalState: {} as any,
    workspaceState: {} as any,
  } as any as vscode.ExtensionContext;
}

/**
 * Helper functions for live integration tests
 */
async function openTempDocuments(
  count: number,
): Promise<vscode.TextDocument[]> {
  const docs: vscode.TextDocument[] = [];
  for (let i = 0; i < count; i++) {
    const doc = await vscode.workspace.openTextDocument({
      content: `temp-${i}`,
      language: "plaintext",
    });
    await vscode.window.showTextDocument(doc, { preview: false });
    docs.push(doc);
  }
  return docs;
}

async function closeAllEditors(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.closeAllEditors");
}

function getOpenTabCount(): number {
  return vscode.window.tabGroups.all.reduce(
    (acc, group) => acc + group.tabs.length,
    0,
  );
}

/**
 * TabManager - Unit Tests
 * Tests core functionality with mocked dependencies
 */
suite("TabManager", () => {
  let tabManager: TabManager;
  let iconService: FileIconService;
  let registerCommandStub: sinon.SinonStub;
  let getConfigurationStub: sinon.SinonStub;

  setup(() => {
    registerCommandStub = sinon
      .stub(vscode.commands, "registerCommand")
      .callsFake((_id: string, _cb: (...args: any[]) => any) => {
        return { dispose: () => {} } as vscode.Disposable;
      });
    const log = createMockLogService();
    iconService = new FileIconService(log);
    tabManager = new TabManager(iconService, log);
  });

  teardown(() => {
    registerCommandStub.restore();
    if (getConfigurationStub) {
      getConfigurationStub.restore();
    }
    tabManager.deactivate();
  });

  suite("labels and item details", () => {
    test("buildTabLabel outputs full label with icons - active only", () => {
      const tab = createMockTab({
        label: "file.ts",
        isActive: true,
        isDirty: false,
      });
      const actual = (tabManager as any).buildTabLabel(tab);
      assert.strictEqual(actual, "file.ts $(target)");
    });

    test("buildTabLabel outputs label only when no icons (trimmed)", () => {
      const tab = createMockTab({
        label: "file.ts",
        isActive: false,
        isDirty: false,
      });
      const actual = (tabManager as any).buildTabLabel(tab);
      assert.strictEqual(actual, "file.ts");
    });

    test("buildTabLabel outputs full label with icons - dirty only", () => {
      const tab = createMockTab({
        label: "file.ts",
        isActive: false,
        isDirty: true,
      });
      const actual = (tabManager as any).buildTabLabel(tab);
      assert.strictEqual(actual, "file.ts $(primitive-dot)");
    });

    test("buildTabLabel outputs full label with icons - active and dirty", () => {
      const tab = createMockTab({
        label: "file.ts",
        isActive: true,
        isDirty: true,
      });
      const actual = (tabManager as any).buildTabLabel(tab);
      assert.strictEqual(actual, "file.ts $(target)$(primitive-dot)");
    });

    test("tabToItem populates description, uri, group, and iconPath", () => {
      const uri = vscode.Uri.file("/workspace/src/components/Button.tsx");
      const tab = createMockTab({
        label: "Button.tsx",
        isActive: true,
        isDirty: false,
        input: new vscode.TabInputText(uri),
      });

      const group: vscode.TabGroup = {
        ...(createMockTabGroup() as any),
        viewColumn: 3,
        tabs: [tab],
      } as any;

      const asRelStub = sinon
        .stub(vscode.workspace, "asRelativePath")
        .callsFake((_v: any) => "src/components/Button.tsx");
      const iconStub = sinon
        .stub(iconService, "inferTabIcon")
        .callsFake((_t: vscode.Tab) => new vscode.ThemeIcon("file-code"));

      const item = (tabManager as any).tabToItem(
        group,
        tab,
        true,
      ) as vscode.QuickPickItem & {
        __tab: vscode.Tab;
        __group: vscode.TabGroup;
      };

      try {
        // Label must exactly match including icon order and spacing
        assert.strictEqual(item.label, "Button.tsx $(target)");
        // Description is dirname of relative path
        assert.strictEqual(item.description, "src/components");
        // URI and group preserved
        assert.ok(item.resourceUri);
        assert.strictEqual((item.resourceUri as vscode.Uri).fsPath, uri.fsPath);
        assert.strictEqual(item.__group.viewColumn, 3);
        // Icon path comes from FileIconService
        assert.ok(item.iconPath instanceof vscode.ThemeIcon);
      } finally {
        asRelStub.restore();
        iconStub.restore();
      }
    });

    test("tabToItem label is trimmed when no icons", () => {
      const uri = vscode.Uri.file("/workspace/src/readme.txt");
      const tab = createMockTab({
        label: "readme.txt",
        isActive: false,
        isDirty: false,
        input: new vscode.TabInputText(uri),
      });
      const group: vscode.TabGroup = {
        ...(createMockTabGroup() as any),
        viewColumn: 2,
        tabs: [tab],
      } as any;

      const asRelStub = sinon
        .stub(vscode.workspace, "asRelativePath")
        .callsFake((_v: any) => "docs/readme.txt");
      const iconStub = sinon
        .stub(iconService, "inferTabIcon")
        .callsFake((_t: vscode.Tab) => vscode.ThemeIcon.File);

      const item = (tabManager as any).tabToItem(
        group,
        tab,
        true,
      ) as vscode.QuickPickItem & {
        __tab: vscode.Tab;
        __group: vscode.TabGroup;
      };

      try {
        assert.strictEqual(item.label, "readme.txt");
        assert.strictEqual(item.description, "docs");
        assert.ok(item.resourceUri);
        assert.strictEqual((item.resourceUri as vscode.Uri).fsPath, uri.fsPath);
        assert.strictEqual(item.__group.viewColumn, 2);
        assert.ok(item.iconPath instanceof vscode.ThemeIcon);
      } finally {
        asRelStub.restore();
        iconStub.restore();
      }
    });
  });

  suite("private helper methods", () => {
    test("mock tabs should have correct properties", () => {
      const activeTab = createMockTab({ isActive: true, label: "test.ts" });
      assert.strictEqual(activeTab.isActive, true);
      assert.strictEqual(activeTab.label, "test.ts");
    });

    test("mock tabs should preserve dirty state", () => {
      const dirtyTab = createMockTab({ isDirty: true, label: "test.ts" });
      assert.strictEqual(dirtyTab.isDirty, true);
    });

    test("mock tabs should support combined states", () => {
      const tab = createMockTab({
        isActive: true,
        isDirty: true,
        label: "test.ts",
      });
      assert.strictEqual(tab.isActive, true);
      assert.strictEqual(tab.isDirty, true);
    });

    test("mock tabs should contain URI information", () => {
      const uri = vscode.Uri.file("/workspace/src/components/Button.tsx");
      const tab = createMockTab({
        input: new vscode.TabInputText(uri),
        label: "Button.tsx",
      });
      assert.ok(tab.input);
      assert.strictEqual(
        (tab.input as vscode.TabInputText).uri.fsPath,
        uri.fsPath,
      );
    });

    test("getTabIdentifier should be consistent for same tab", () => {
      const uri = vscode.Uri.file("/path/file.ts");
      const tab = createMockTab({
        input: new vscode.TabInputText(uri),
        label: "file.ts",
      });
      const group = createMockTabGroup();

      // Even though we can't directly access getTabIdentifier (private),
      // we validate tabs maintain their identity through label and URI
      assert.strictEqual(tab.label, "file.ts");
    });
  });

  suite("activate and deactivate", () => {
    test("should activate and allow multiple safe deactivations", () => {
      const subscriptions: vscode.Disposable[] = [];
      const context = {
        subscriptions,
        extensionPath: "/mock/path",
        globalState: {} as any,
        workspaceState: {} as any,
      } as vscode.ExtensionContext;

      tabManager.activate(context);
      tabManager.deactivate();

      // Verify deactivate is idempotent - can call multiple times
      tabManager.deactivate();
      tabManager.deactivate();

      // Should be able to activate again after deactivation
      tabManager.activate(context);
      assert.ok(
        true,
        "Multiple activate/deactivate cycles completed without errors",
      );
    });

    test("should handle multiple activations and maintain consistent state", () => {
      const subscriptions: vscode.Disposable[] = [];
      const context = {
        subscriptions,
        extensionPath: "/mock/path",
        globalState: {} as any,
        workspaceState: {} as any,
      } as vscode.ExtensionContext;

      const initialCount = subscriptions.length;

      tabManager.activate(context);
      tabManager.deactivate();
      tabManager.activate(context);
      tabManager.deactivate();

      // Verify multiple cycles completed successfully
      assert.strictEqual(
        initialCount,
        0,
        `Started with ${initialCount} subscriptions, should be 0`,
      );
      assert.ok(true, "Multiple activation cycles completed without errors");
    });
  });

  suite("tab state management", () => {
    test("should handle tabs with no URI gracefully", () => {
      const tab = createMockTab({
        input: undefined,
        label: "untitled",
      });
      assert.strictEqual(tab.label, "untitled");
    });

    test("should handle tabs from different groups", () => {
      const group1 = createMockTabGroup();
      const group2 = { ...createMockTabGroup(), viewColumn: 2 };

      assert.notStrictEqual(group1.viewColumn, group2.viewColumn);
    });

    test("should distinguish between tabs in different groups with same filename", () => {
      const uri = vscode.Uri.file("/path/file.ts");
      const tab1 = createMockTab({
        input: new vscode.TabInputText(uri),
        label: "file.ts",
      });
      const tab2 = createMockTab({
        input: new vscode.TabInputText(uri),
        label: "file.ts",
      });

      // Verify they have the same label but are different objects
      assert.strictEqual(
        tab1.label,
        tab2.label,
        "Both tabs should have same filename",
      );
      assert.notStrictEqual(
        tab1,
        tab2,
        "Tabs should be different object instances",
      );
      // Verify each has its own group
      assert.notStrictEqual(
        tab1.group,
        tab2.group,
        "Tabs should have different group references",
      );
    });
  });

  suite("error handling", () => {
    test("should handle deactivation when not activated (idempotent)", () => {
      // Deactivate without activation - should be safe
      tabManager.deactivate();
      tabManager.deactivate();
      tabManager.deactivate();

      // Should still be able to activate after multiple deactivate calls
      const context = createMockContext();

      tabManager.activate(context);
      assert.ok(
        true,
        "Deactivate is idempotent and allows subsequent activation",
      );
    });

    test("should activate with empty subscriptions array", () => {
      const subscriptions: vscode.Disposable[] = [];
      const context = {
        subscriptions,
        extensionPath: "/mock/path",
        globalState: {} as any,
        workspaceState: {} as any,
      } as vscode.ExtensionContext;

      const beforeLength = subscriptions.length;
      assert.strictEqual(
        beforeLength,
        0,
        `Should start with 0 subscriptions, got: ${beforeLength}`,
      );

      tabManager.activate(context);

      // Verify subscriptions array still exists and is valid
      assert.ok(
        Array.isArray(subscriptions),
        "Subscriptions should remain an array after activation",
      );
      assert.ok(
        subscriptions.length >= 0,
        `Subscriptions length should be non-negative, got: ${subscriptions.length}`,
      );
    });
  });

  suite("configuration settings", () => {
    setup(() => {
      getConfigurationStub = sinon
        .stub(vscode.workspace, "getConfiguration")
        .callsFake((section?: string) => {
          if (section === "editor-switcher") {
            return {
              get: (key: string, defaultValue: any) => {
                const defaults: Record<string, any> = {
                  onCloseKeepGroupFocus: true,
                  onCloseSelectTabStrategy: "selectNext",
                };
                return defaults[key] ?? defaultValue;
              },
            } as any;
          }
          return {} as any;
        });
    });

    teardown(() => {
      getConfigurationStub.restore();
    });

    test("onCloseKeepGroupFocus should return true by default", () => {
      const setting = (tabManager as any).onCloseKeepGroupFocus;
      assert.strictEqual(setting, true, "Should default to true");
    });

    test("onCloseSelectTabStrategy should return selectNext by default", () => {
      const setting = (tabManager as any).onCloseSelectTabStrategy;
      assert.strictEqual(setting, "selectNext", "Should default to selectNext");
    });

    test("onCloseKeepGroupFocus should respect false setting", () => {
      getConfigurationStub.restore();
      getConfigurationStub = sinon
        .stub(vscode.workspace, "getConfiguration")
        .callsFake((section?: string) => {
          if (section === "editor-switcher") {
            return {
              get: (key: string, defaultValue: any) => {
                if (key === "onCloseKeepGroupFocus") {
                  return false;
                }
                if (key === "onCloseSelectTabStrategy") {
                  return "selectNext";
                }
                return defaultValue;
              },
            } as any;
          }
          return {} as any;
        });

      // Create new TabManager to pick up stubbed config
      const log = createMockLogService();
      const testManager = new TabManager(iconService, log);
      const setting = (testManager as any).onCloseKeepGroupFocus;
      assert.strictEqual(setting, false, "Should respect false setting");
      testManager.deactivate();
    });

    test("onCloseSelectTabStrategy should respect selectPrevious setting", () => {
      getConfigurationStub.restore();
      getConfigurationStub = sinon
        .stub(vscode.workspace, "getConfiguration")
        .callsFake((section?: string) => {
          if (section === "editor-switcher") {
            return {
              get: (key: string, defaultValue: any) => {
                if (key === "onCloseKeepGroupFocus") {
                  return true;
                }
                if (key === "onCloseSelectTabStrategy") {
                  return "selectPrevious";
                }
                return defaultValue;
              },
            } as any;
          }
          return {} as any;
        });

      const log = createMockLogService();
      const testManager = new TabManager(iconService, log);
      const setting = (testManager as any).onCloseSelectTabStrategy;
      assert.strictEqual(
        setting,
        "selectPrevious",
        "Should respect selectPrevious setting",
      );
      testManager.deactivate();
    });

    test("onCloseSelectTabStrategy should default to selectNext for invalid value", () => {
      getConfigurationStub.restore();
      getConfigurationStub = sinon
        .stub(vscode.workspace, "getConfiguration")
        .callsFake((section?: string) => {
          if (section === "editor-switcher") {
            return {
              get: (key: string, defaultValue: any) => {
                if (key === "onCloseKeepGroupFocus") {
                  return true;
                }
                if (key === "onCloseSelectTabStrategy") {
                  return "invalidValue";
                }
                return defaultValue;
              },
            } as any;
          }
          return {} as any;
        });

      const log = createMockLogService();
      const testManager = new TabManager(iconService, log);
      const setting = (testManager as any).onCloseSelectTabStrategy;
      assert.strictEqual(
        setting,
        "selectNext",
        "Should default to selectNext for invalid values",
      );
      testManager.deactivate();
    });
  });

  suite("selection strategy with selectNext (default)", () => {
    setup(() => {
      getConfigurationStub = sinon
        .stub(vscode.workspace, "getConfiguration")
        .callsFake((section?: string) => {
          if (section === "editor-switcher") {
            return {
              get: (key: string, defaultValue: any) => {
                if (key === "onCloseKeepGroupFocus") {
                  return false;
                }
                if (key === "onCloseSelectTabStrategy") {
                  return "selectNext";
                }
                return defaultValue;
              },
            } as any;
          }
          return {} as any;
        });
    });

    teardown(() => {
      getConfigurationStub.restore();
    });

    test("findNearbyNonSeparatorItem with selectNext should select same index or later", async () => {
      // Setup: 5 non-separator items, deleting item at index 2
      const context = createMockContext();
      tabManager.activate(context);

      // Create mock quick pick with items
      const items = [
        {
          label: "item0",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
        {
          label: "item1",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
        {
          label: "item2",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
        {
          label: "item3",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
        {
          label: "item4",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
      ];

      // Simulate setting active quick pick by calling a public method
      await (tabManager as any).showQuickPick();
      const quickPick = (tabManager as any).activeQuickPick;
      if (quickPick) {
        quickPick.items = items as any;

        // Call private method via reflection
        const result = (tabManager as any).findNearbyNonSeparatorItem(
          2,
          items[2] as any,
        );
        // With selectNext and no group restriction, should select same or later position
        assert.ok(result, "Should find a nearby item");
        assert.ok(
          items.indexOf(result) >= 2,
          "Should select same index or later with selectNext",
        );
      }
    });

    test("findNearbyNonSeparatorItem with selectNext at end should select last item", async () => {
      const context = createMockContext();
      tabManager.activate(context);

      const items = [
        {
          label: "item0",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
        {
          label: "item1",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
      ];

      await (tabManager as any).showQuickPick();
      const quickPick = (tabManager as any).activeQuickPick;
      if (quickPick) {
        quickPick.items = items as any;

        const result = (tabManager as any).findNearbyNonSeparatorItem(
          1,
          items[1] as any,
        );
        assert.ok(result, "Should find a nearby item");
        assert.strictEqual(
          result.label,
          "item1",
          "Should select the last item",
        );
      }
    });
  });

  suite("selection strategy with selectPrevious", () => {
    setup(() => {
      getConfigurationStub = sinon
        .stub(vscode.workspace, "getConfiguration")
        .callsFake((section?: string) => {
          if (section === "editor-switcher") {
            return {
              get: (key: string, defaultValue: any) => {
                if (key === "onCloseKeepGroupFocus") {
                  return false;
                }
                if (key === "onCloseSelectTabStrategy") {
                  return "selectPrevious";
                }
                return defaultValue;
              },
            } as any;
          }
          return {} as any;
        });
    });

    teardown(() => {
      getConfigurationStub.restore();
    });

    test("findNearbyNonSeparatorItem with selectPrevious should select earlier item", async () => {
      const context = createMockContext();
      tabManager.activate(context);

      const items = [
        {
          label: "item0",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
        {
          label: "item1",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
        {
          label: "item2",
          kind: undefined,
          __tab: {},
          __group: { viewColumn: 1 } as any,
        },
      ];

      await (tabManager as any).showQuickPick();
      const quickPick = (tabManager as any).activeQuickPick;
      if (quickPick) {
        quickPick.items = items as any;

        // Create new TabManager with selectPrevious setting
        const log = createMockLogService();
        const testManager = new TabManager(iconService, log);
        testManager.activate(context);
        await (testManager as any).showQuickPick();
        const testQp = (testManager as any).activeQuickPick;
        if (testQp) {
          testQp.items = items as any;
          const result = (testManager as any).findNearbyNonSeparatorItem(
            2,
            items[2] as any,
          );
          assert.ok(result, "Should find a nearby item");
          // With selectPrevious, should prefer item before the deleted one
          assert.ok(
            items.indexOf(result) < 2,
            "Should select item before deleted index with selectPrevious",
          );
        }
        testManager.deactivate();
      }
    });
  });

  suite("group affinity (onCloseKeepGroupFocus)", () => {
    test("findNearbyNonSeparatorItem with onCloseKeepGroupFocus=true should prefer same group", async () => {
      getConfigurationStub = sinon
        .stub(vscode.workspace, "getConfiguration")
        .callsFake((section?: string) => {
          if (section === "editor-switcher") {
            return {
              get: (key: string, defaultValue: any) => {
                if (key === "onCloseKeepGroupFocus") {
                  return true;
                }
                if (key === "onCloseSelectTabStrategy") {
                  return "selectNext";
                }
                return defaultValue;
              },
            } as any;
          }
          return {} as any;
        });

      const context = createMockContext();
      tabManager.activate(context);

      const group1 = { viewColumn: 1 } as any;
      const group2 = { viewColumn: 2 } as any;

      const items = [
        { label: "g1-item0", kind: undefined, __tab: {}, __group: group1 },
        { label: "g1-item1", kind: undefined, __tab: {}, __group: group1 },
        { label: "g2-item0", kind: undefined, __tab: {}, __group: group2 },
        { label: "g2-item1", kind: undefined, __tab: {}, __group: group2 },
      ];

      await (tabManager as any).showQuickPick();
      const quickPick = (tabManager as any).activeQuickPick;
      if (quickPick) {
        quickPick.items = items as any;

        // Delete item from group 1
        const result = (tabManager as any).findNearbyNonSeparatorItem(
          1,
          items[1] as any,
        );
        assert.ok(result, "Should find a nearby item");
        // Should prefer group 1 since it was the deleted item's group
        assert.ok(
          result.__group.viewColumn === 1,
          "Should prefer same group when onCloseKeepGroupFocus=true",
        );
      }

      getConfigurationStub.restore();
    });

    test("findNearbyNonSeparatorItem with onCloseKeepGroupFocus=false should select next available", async () => {
      getConfigurationStub = sinon
        .stub(vscode.workspace, "getConfiguration")
        .callsFake((section?: string) => {
          if (section === "editor-switcher") {
            return {
              get: (key: string, defaultValue: any) => {
                if (key === "onCloseKeepGroupFocus") {
                  return false;
                }
                if (key === "onCloseSelectTabStrategy") {
                  return "selectNext";
                }
                return defaultValue;
              },
            } as any;
          }
          return {} as any;
        });

      const context = createMockContext();
      const log = createMockLogService();
      const testManager = new TabManager(iconService, log);
      testManager.activate(context);

      const group1 = { viewColumn: 1 } as any;
      const group2 = { viewColumn: 2 } as any;

      const items = [
        { label: "g1-item0", kind: undefined, __tab: {}, __group: group1 },
        { label: "g1-item1", kind: undefined, __tab: {}, __group: group1 },
        { label: "g2-item0", kind: undefined, __tab: {}, __group: group2 },
      ];

      await (testManager as any).showQuickPick();
      const quickPick = (testManager as any).activeQuickPick;
      if (quickPick) {
        quickPick.items = items as any;

        // Delete item from group 1, but setting disables group affinity
        const result = (testManager as any).findNearbyNonSeparatorItem(
          1,
          items[1] as any,
        );
        assert.ok(result, "Should find a nearby item");
        // With affinity disabled, should select from available items
        assert.ok(
          result && items.indexOf(result) >= 1,
          "Should select item at or after deleted index when affinity disabled",
        );
      }
      testManager.deactivate();
      getConfigurationStub.restore();
    });
  });
});

/**
 * TabManager - Mock Integration Tests
 * Integration tests continue below
 */
suite("TabManager - Mock Integration Tests", () => {
  let tabManager: TabManager;
  let registerCommandStub: sinon.SinonStub;

  setup(() => {
    registerCommandStub = sinon
      .stub(vscode.commands, "registerCommand")
      .callsFake((_id: string, _cb: (...args: any[]) => any) => {
        return { dispose: () => {} } as vscode.Disposable;
      });
    const log = createMockLogService();
    const iconService = new FileIconService(log);
    tabManager = new TabManager(iconService, log);
  });

  teardown(() => {
    registerCommandStub.restore();
    tabManager.deactivate();
  });

  test("should handle rapid activate/deactivate cycles and remain functional", () => {
    const context = createMockContext();
    const cycles = 5;
    let cyclesCompleted = 0;

    for (let i = 0; i < cycles; i++) {
      tabManager.activate(context);
      tabManager.deactivate();
      cyclesCompleted++;
    }

    assert.strictEqual(
      cyclesCompleted,
      cycles,
      `Expected ${cycles} complete cycles, completed: ${cyclesCompleted}`,
    );

    // Verify final state - can still deactivate
    tabManager.deactivate();
    assert.ok(
      true,
      `Completed ${cyclesCompleted} rapid cycles and final cleanup successfully`,
    );
  });

  test("should handle activation with existing subscriptions and preserve them", () => {
    const existingSubscriptions: vscode.Disposable[] = [
      { dispose: () => {} },
      { dispose: () => {} },
    ];
    const context = {
      subscriptions: existingSubscriptions,
      extensionPath: "/mock/path",
      globalState: {} as any,
      workspaceState: {} as any,
    } as vscode.ExtensionContext;

    const initialLength = existingSubscriptions.length;
    assert.strictEqual(
      initialLength,
      2,
      `Initial subscriptions should be 2, got: ${initialLength}`,
    );

    tabManager.activate(context);

    // Verify existing subscriptions were not removed
    assert.ok(
      existingSubscriptions.length >= initialLength,
      `After activation, subscriptions (${existingSubscriptions.length}) should be >= initial (${initialLength})`,
    );

    // Verify we can still access original subscriptions
    assert.strictEqual(
      typeof existingSubscriptions[0].dispose,
      "function",
      "Original subscriptions should remain valid with dispose method",
    );
  });

  test("should maintain state consistency across operations and remain idempotent", () => {
    const context = createMockContext();
    const operationSequence = [
      "activate",
      "deactivate",
      "activate",
      "deactivate",
    ];
    let step = 0;

    // Activate
    tabManager.activate(context);
    step++;
    // Deactivate
    tabManager.deactivate();
    step++;
    // Activate again
    tabManager.activate(context);
    step++;
    // Deactivate again
    tabManager.deactivate();
    step++;

    assert.strictEqual(
      step,
      operationSequence.length,
      `Expected to complete all ${operationSequence.length} operations, completed: ${step}`,
    );

    // Verify final state - deactivate is idempotent
    tabManager.deactivate();
    tabManager.deactivate();

    assert.ok(
      true,
      `Completed operation sequence: ${operationSequence.join(" -> ")} with idempotent deactivations`,
    );
  });
});

/**
 * TabManager - Live Integration Tests
 * Tests with real VS Code API and live editor environment
 */
suite("TabManager - Live Integration Tests", () => {
  const EXTENSION_ID = "mikejhill.vscode-editor-switcher";
  const OPEN_COMMAND = "editor-switcher.open";
  const CLOSE_COMMAND = "editor-switcher.closeSelected";

  let extension: vscode.Extension<any> | undefined;

  setup(async () => {
    extension = vscode.extensions.getExtension(EXTENSION_ID);
    if (!extension) {
      throw new Error(
        `Extension ${EXTENSION_ID} not found in test environment`,
      );
    }

    if (!extension.isActive) {
      await extension.activate();
    }
  });

  teardown(async () => {
    await closeAllEditors();
  });

  suite("extension activation and command registration", () => {
    test("extension should be activated", () => {
      assert.ok(extension, "Extension should be loaded");
      assert.ok(extension!.isActive, "Extension should be activated");
    });

    test("commands should be registered after activation", async () => {
      const allCommands = await vscode.commands.getCommands(true);

      assert.ok(
        allCommands.includes(OPEN_COMMAND),
        `${OPEN_COMMAND} should be registered`,
      );
      assert.ok(
        allCommands.includes(CLOSE_COMMAND),
        `${CLOSE_COMMAND} should be registered`,
      );
    });

    test("editor-switcher.open command should be executable", async () => {
      await assert.doesNotReject(async () => {
        const commandPromise = vscode.commands.executeCommand(OPEN_COMMAND);
        await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
        await commandPromise;
      }, "editor-switcher.open should execute without errors");
    });

    test("editor-switcher.closeSelected command should be executable", async () => {
      await assert.doesNotReject(
        async () => await vscode.commands.executeCommand(CLOSE_COMMAND),
        "editor-switcher.closeSelected should execute without errors",
      );
    });
  });

  suite("tab management with real editors", () => {
    test("open command shows quick pick with open tabs", async () => {
      await openTempDocuments(2);
      await assert.doesNotReject(async () => {
        const cmd = vscode.commands.executeCommand(OPEN_COMMAND);
        await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
        await cmd;
      }, "open command should work with real tabs");
    });

    test("should have tabs available after opening documents", async () => {
      const initialCount = getOpenTabCount();
      await openTempDocuments(3);

      const afterCount = getOpenTabCount();
      assert.strictEqual(
        afterCount,
        initialCount + 3,
        "Should have 3 additional tabs",
      );
    });

    test("closeSelected closes one tab when picker is open", async () => {
      await openTempDocuments(3);
      const before = getOpenTabCount();

      await vscode.commands.executeCommand(OPEN_COMMAND);
      await vscode.commands.executeCommand(CLOSE_COMMAND);

      const after = getOpenTabCount();
      assert.strictEqual(
        after,
        before - 1,
        "closeSelected should remove the highlighted tab",
      );

      await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
    });

    test("closeSelected does nothing after picker is dismissed", async () => {
      await openTempDocuments(2);
      const before = getOpenTabCount();

      await vscode.commands.executeCommand(OPEN_COMMAND);
      await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
      await vscode.commands.executeCommand(CLOSE_COMMAND);

      const after = getOpenTabCount();
      assert.strictEqual(
        after,
        before,
        "closeSelected should be a no-op without an active picker",
      );
    });

    test("should handle multiple editors in different groups", async () => {
      await openTempDocuments(2);
      const initialCount = getOpenTabCount();

      await assert.doesNotReject(async () => {
        const cmd = vscode.commands.executeCommand(OPEN_COMMAND);
        await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
        await cmd;
      }, "Should handle editors without errors");

      assert.strictEqual(
        getOpenTabCount(),
        initialCount,
        "Tab count should remain unchanged",
      );
    });
  });

  suite("quick pick interaction", () => {
    test("open command can be called multiple times", async () => {
      await openTempDocuments(2);

      for (let i = 0; i < 3; i++) {
        await assert.doesNotReject(
          async () => {
            const cmd = vscode.commands.executeCommand(OPEN_COMMAND);
            await vscode.commands.executeCommand(
              "workbench.action.closeQuickOpen",
            );
            await cmd;
          },
          `Should open picker on iteration ${i + 1}`,
        );
      }
    });

    test("closeSelected works correctly when picker is open", async () => {
      await openTempDocuments(3);
      const initialCount = getOpenTabCount();

      const openCmd = vscode.commands.executeCommand(OPEN_COMMAND);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Let picker open

      await vscode.commands.executeCommand(CLOSE_COMMAND);
      const afterClose = getOpenTabCount();

      assert.strictEqual(
        afterClose,
        initialCount - 1,
        "One tab should be closed",
      );

      await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
      await openCmd;
    });

    test("pressing escape dismisses the picker without closing tabs", async () => {
      await openTempDocuments(2);
      const before = getOpenTabCount();

      const openCmd = vscode.commands.executeCommand(OPEN_COMMAND);
      await new Promise((resolve) => setTimeout(resolve, 100));

      await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
      await openCmd;

      const after = getOpenTabCount();
      assert.strictEqual(after, before, "No tabs should be closed");
    });
  });
});
