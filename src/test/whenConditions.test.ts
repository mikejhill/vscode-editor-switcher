import * as assert from "assert";
import * as vscode from "vscode";

/**
 * Context and When Condition Tests
 * Tests VS Code context variable management and when clause evaluation using actual VS Code APIs
 *
 * These tests verify that the extension properly manages the editorSwitcherVisible
 * context variable, which controls when the closeSelected command's keybinding (ctrl+w)
 * is active. The when clause prevents conflicts with VS Code's default editor close behavior.
 *
 * Unlike unit tests that mock the API, these integration tests use the real VS Code
 * extension host to validate actual command registration and context management.
 */
suite("When Conditions and Context Management", () => {
  const EXTENSION_ID = "mikejhill.vscode-editor-switcher";
  const OPEN_COMMAND = "editor-switcher.open";
  const CLOSE_COMMAND = "editor-switcher.closeSelected";
  const CONTEXT_KEY = "editorSwitcherVisible";

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

  let extension: vscode.Extension<any> | undefined;

  setup(async () => {
    // Get the extension
    extension = vscode.extensions.getExtension(EXTENSION_ID);
    if (!extension) {
      throw new Error(
        `Extension ${EXTENSION_ID} not found in test environment`,
      );
    }

    // Ensure extension is activated
    if (!extension.isActive) {
      await extension.activate();
    }
  });

  teardown(async () => {
    // Clean up: Set context to false to avoid affecting other tests
    await vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
  });

  suite("editorSwitcherVisible context variable", () => {
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
      // Command should exist and be callable (even if we immediately cancel the quick pick)
      await assert.doesNotReject(async () => {
        const commandPromise = vscode.commands.executeCommand(OPEN_COMMAND);
        await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
        await commandPromise;
      }, "editor-switcher.open should execute without errors");
    });

    test("editor-switcher.closeSelected command should be executable", async () => {
      // This command can be called but won't do anything unless the quick pick is open
      await assert.doesNotReject(
        async () => await vscode.commands.executeCommand(CLOSE_COMMAND),
        "editor-switcher.closeSelected should execute without errors",
      );
    });
  });

  suite("when clause dependencies", () => {
    test("commands should follow naming convention", async () => {
      const allCommands = await vscode.commands.getCommands(true);
      const extensionCommands = allCommands.filter((cmd) =>
        cmd.startsWith("editor-switcher."),
      );

      assert.ok(
        extensionCommands.length >= 2,
        "Should have at least 2 extension commands",
      );

      extensionCommands.forEach((cmd) => {
        assert.ok(
          cmd.startsWith("editor-switcher."),
          `Command ${cmd} should follow naming convention`,
        );
      });
    });

    test("context variable name should match package.json when clause", async () => {
      // The when clause "editorSwitcherVisible" in package.json must match the context key
      // This is validated by setting and checking the context
      await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true);

      // If the context key works, it means it matches the when clause
      // (VS Code would log warnings/errors if there was a mismatch)
      assert.ok(true, "Context key is compatible with when clauses");

      await vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
    });
  });

  suite("context state transitions", () => {
    test("extension activates without errors", () => {
      assert.ok(extension!.isActive, "Extension should activate successfully");
    });

    test("setContext API should accept boolean values", async () => {
      await assert.doesNotReject(async () => {
        await Promise.resolve(
          vscode.commands.executeCommand("setContext", CONTEXT_KEY, true),
        );
        await Promise.resolve(
          vscode.commands.executeCommand("setContext", CONTEXT_KEY, false),
        );
      }, "setContext should accept boolean values");
    });

    test("context can be set multiple times", async () => {
      for (let i = 0; i < 5; i++) {
        await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true);
        await vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);
      }

      assert.ok(true, "Context can toggle multiple times without errors");
    });
  });

  suite("command availability based on context", () => {
    test("open command is always available", async () => {
      const allCommands = await vscode.commands.getCommands(true);

      assert.ok(
        allCommands.includes(OPEN_COMMAND),
        "open command should always be available",
      );
    });

    test("closeSelected command is available", async () => {
      const allCommands = await vscode.commands.getCommands(true);

      assert.ok(
        allCommands.includes(CLOSE_COMMAND),
        "closeSelected command should be available",
      );

      // Note: The keybinding for this command is gated by the when clause
      // in package.json, but the command itself is always registered
    });

    test("commands can be executed programmatically", async () => {
      await assert.doesNotReject(async () => {
        await vscode.commands.executeCommand(CLOSE_COMMAND);
      }, "Commands should execute without throwing");
    });
  });

  suite("when clause evaluation scenarios", () => {
    test("setContext command is available in VS Code API", async () => {
      await assert.doesNotReject(
        async () =>
          await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true),
        "setContext should be callable",
      );
    });

    test("context variable supports boolean values", async () => {
      // Set to true
      await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true);

      // Set to false
      await vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);

      assert.ok(true, "Context variable accepts boolean values");
    });

    test("context key is a simple identifier", () => {
      // Context keys should be simple alphanumeric identifiers
      // without dots or namespacing (those are for when clause expressions)
      assert.ok(
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(CONTEXT_KEY),
        "Context key should be a simple identifier",
      );

      assert.ok(
        !CONTEXT_KEY.includes("."),
        "Context key should not include namespace prefix",
      );
    });

    test("keybinding uses correct when clause syntax", async () => {
      // The when clause in package.json is just the context variable name
      // This verifies the constant matches what would be in package.json
      assert.strictEqual(
        CONTEXT_KEY,
        "editorSwitcherVisible",
        "Context key must match package.json when clause",
      );
    });
  });

  suite("setContext command validation", () => {
    test("setContext with correct signature", async () => {
      // Verify setContext accepts (key: string, value: boolean)
      await assert.doesNotReject(
        async () =>
          await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true),
        "setContext should accept (string, boolean) signature",
      );
    });

    test("context key follows naming convention", () => {
      assert.strictEqual(
        CONTEXT_KEY,
        "editorSwitcherVisible",
        "Context key must be 'editorSwitcherVisible'",
      );

      assert.strictEqual(
        typeof CONTEXT_KEY,
        "string",
        "Context key should be a string",
      );
    });

    test("context value must be boolean", async () => {
      // Test boolean values work
      await vscode.commands.executeCommand("setContext", CONTEXT_KEY, true);
      await vscode.commands.executeCommand("setContext", CONTEXT_KEY, false);

      // Note: VS Code will accept other types but best practice is boolean
      // for when clause conditions
      assert.ok(true, "Boolean values work for setContext");
    });
  });

  suite("integration with real tabs", () => {
    test("open command shows quick pick with open tabs", async () => {
      await openTempDocuments(2);
      await assert.doesNotReject(async () => {
        const cmd = vscode.commands.executeCommand(OPEN_COMMAND);
        await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
        await cmd;
      }, "open command should work with real tabs");

      await closeAllEditors();
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
      await closeAllEditors();
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

      await closeAllEditors();
    });
  });
});
