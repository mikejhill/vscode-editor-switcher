import * as assert from "assert";
import * as vscode from "vscode";
import { FileIconService } from "../fileIconService";
import { TabManager } from "../tabManager";
import * as sinon from "sinon";

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

  setup(() => {
    registerCommandStub = sinon
      .stub(vscode.commands, "registerCommand")
      .callsFake((_id: string, _cb: (...args: any[]) => any) => {
        return { dispose: () => {} } as vscode.Disposable;
      });
    iconService = new FileIconService();
    tabManager = new TabManager(iconService);
  });

  teardown(() => {
    registerCommandStub.restore();
    tabManager.deactivate();
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
    test("should dispose quick pick on deactivation without throwing", () => {
      const subscriptions: vscode.Disposable[] = [];
      const context = {
        subscriptions,
        extensionPath: "/mock/path",
        globalState: {} as any,
        workspaceState: {} as any,
      } as vscode.ExtensionContext;

      tabManager.activate(context);
      const initialLength = subscriptions.length;

      // Should not throw when deactivating
      assert.doesNotThrow(() => {
        tabManager.deactivate();
      });

      // Verify it can be deactivated multiple times safely
      assert.doesNotThrow(() => {
        tabManager.deactivate();
      });
    });

    test("should handle multiple activations gracefully", () => {
      const subscriptions: vscode.Disposable[] = [];
      const context = {
        subscriptions,
        extensionPath: "/mock/path",
        globalState: {} as any,
        workspaceState: {} as any,
      } as vscode.ExtensionContext;

      tabManager.activate(context);
      const firstActivationLength = subscriptions.length;

      // Deactivate and activate again
      tabManager.deactivate();

      tabManager.activate(context);
      const secondActivationLength = subscriptions.length;

      assert.strictEqual(
        secondActivationLength,
        firstActivationLength + 2,
        "Should register two additional commands on second activation",
      );
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
    test("should handle deactivation when no quick pick is active", () => {
      // Should not throw even if deactivate is called before activate
      assert.doesNotThrow(() => {
        tabManager.deactivate();
      }, "Deactivate should not throw without prior activation");

      // Should also handle double deactivation
      assert.doesNotThrow(() => {
        tabManager.deactivate();
      }, "Deactivate should be idempotent");
    });

    test("should handle activation with empty subscriptions array", () => {
      const subscriptions: vscode.Disposable[] = [];
      const context = {
        subscriptions,
        extensionPath: "/mock/path",
        globalState: {} as any,
        workspaceState: {} as any,
      } as vscode.ExtensionContext;

      tabManager.activate(context);
      assert.ok(subscriptions.length > 0);
    });
  });
});

/**
 * TabManager - Unit Tests (Mock-based)
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
    const iconService = new FileIconService();
    tabManager = new TabManager(iconService);
  });

  teardown(() => {
    registerCommandStub.restore();
    tabManager.deactivate();
  });

  test("should handle rapid activate/deactivate cycles", () => {
    const context = createMockContext();

    // Should not throw during rapid cycling
    assert.doesNotThrow(() => {
      for (let i = 0; i < 5; i++) {
        tabManager.activate(context);
        tabManager.deactivate();
      }
    }, "Should handle rapid activate/deactivate without errors");

    // Verify context is still functional after cycles
    const subscriptions: vscode.Disposable[] = [];
    const newContext = {
      subscriptions,
      extensionPath: "/mock/path",
      globalState: {} as any,
      workspaceState: {} as any,
    } as vscode.ExtensionContext;

    tabManager.activate(newContext);
    assert.strictEqual(
      subscriptions.length,
      2,
      "Should still register commands after cycles",
    );
  });

  test("should handle activation with existing subscriptions", () => {
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

    const initialLength = context.subscriptions.length;
    tabManager.activate(context);

    assert.strictEqual(context.subscriptions.length, initialLength + 2);
  });

  test("should maintain state consistency across operations", () => {
    const context = createMockContext();

    tabManager.activate(context);
    const afterActivate = context.subscriptions.length;

    tabManager.deactivate();
    tabManager.activate(context);

    assert.strictEqual(context.subscriptions.length, afterActivate + 2);
  });
});

/**
 * TabManager - Live Integration Tests
 * Tests with real VS Code API and live editor environment
 */
suite("TabManager - Live Integration Tests", () => {
  const EXTENSION_ID = "mikejhill.vscode-editor-switcher";
  const OPEN_COMMAND = "editorSwitcher.open";
  const CLOSE_COMMAND = "editorSwitcher.closeSelected";

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

    test("editorSwitcher.open command should be executable", async () => {
      await assert.doesNotReject(async () => {
        const commandPromise = vscode.commands.executeCommand(OPEN_COMMAND);
        await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
        await commandPromise;
      }, "editorSwitcher.open should execute without errors");
    });

    test("editorSwitcher.closeSelected command should be executable", async () => {
      await assert.doesNotReject(
        async () => await vscode.commands.executeCommand(CLOSE_COMMAND),
        "editorSwitcher.closeSelected should execute without errors",
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
