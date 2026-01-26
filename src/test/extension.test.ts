import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";

/**
 * Extension Module Tests
 * Tests main extension activation and deactivation
 */
suite("Extension Module", () => {
  suite("Extension Activation/Commands", () => {
    let registerCommandStub: sinon.SinonStub;
    let context: any;

    beforeEach(() => {
      context = {
        subscriptions: [],
        extensionPath: "/mock/path",
        globalState: {} as any,
        workspaceState: {} as any,
      } as unknown as vscode.ExtensionContext;
      registerCommandStub = sinon
        .stub(vscode.commands, "registerCommand")
        .returns({ dispose: () => {} });
    });
    afterEach(() => {
      registerCommandStub.restore();
    });

    test("should activate and register commands exactly twice", () => {
      const ext = require("../extension");
      ext.activate(context);
      assert.strictEqual(
        registerCommandStub.callCount,
        2,
        "Should register exactly 2 commands",
      );
    });

    test("should register editorSwitcher.open and closeSelected commands", () => {
      const ext = require("../extension");
      ext.activate(context);

      assert.strictEqual(registerCommandStub.callCount, 2);
      assert.strictEqual(
        registerCommandStub.firstCall.args[0],
        "editorSwitcher.open",
      );
      assert.strictEqual(
        registerCommandStub.secondCall.args[0],
        "editorSwitcher.closeSelected",
      );
    });

    test("should add command disposables to subscriptions", () => {
      const ext = require("../extension");
      ext.activate(context);

      assert.strictEqual(
        context.subscriptions.length,
        3,
        "Should add logger and 2 command disposables to subscriptions",
      );
    });

    test("should export deactivate function that can be called without error", () => {
      const ext = require("../extension");
      assert.doesNotThrow(() => {
        ext.deactivate();
      }, "Deactivate should not throw");
    });
  });
  test("should export activate function", () => {
    // Module-level validation
    assert.ok(typeof require("../extension").activate === "function");
  });

  test("should export deactivate function", () => {
    // Module-level validation
    assert.ok(typeof require("../extension").deactivate === "function");
  });
});
