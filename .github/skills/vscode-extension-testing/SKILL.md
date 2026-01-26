---
name: vscode-extension-testing
description: Use when writing or reviewing tests for VS Code extension development. Provides clear guidance on how to create, analyze, and run tests in order to validate real extension behavior end-to-end.
license: MIT
metadata:
  author: Michael Hill (mikejhill.com)
  version: "1.0"
compatibility: VS Code extension development with NPM, Mocha, Sinon, and the VS Code Test API
---

# VS Code Extension Testing

Create well-formed, meaningful tests for VS Code extensions that validate actual behavior and avoid no-op tests.

## When to Use This Skill

Use this skill when:

- Writing tests for VS Code extensions
- Need to decide between unit and integration tests
- Want to mock VS Code APIs for isolated testing
- Using the VS Code test harness for real API validation
- Need to ensure tests actually test something meaningful
- Fixing weak assertions or no-op tests

## Quick Start

### Structure: Unit + Integration Tests

```typescript
import * as assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
import { MyService } from "../myService";

suite("MyService", () => {
  let registerCommandStub: sinon.SinonStub;

  setup(() => {
    registerCommandStub = sinon.stub(vscode.commands, "registerCommand");
  });

  teardown(() => {
    sinon.restore();
  });

  // UNIT TESTS: Mocked, isolated, fast
  test("should register commands on activation", () => {
    const service = new MyService();
    service.activate();

    assert.strictEqual(registerCommandStub.callCount, 2);
    assert.strictEqual(registerCommandStub.firstCall.args[0], "command1");
    assert.strictEqual(registerCommandStub.secondCall.args[0], "command2");
  });

  // INTEGRATION TESTS: Real VS Code APIs
  test("should execute command in real VS Code", async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes("myExtension.myCommand"));
  });
});
```

## Key Principles

1. **Unit tests use mocks**: Test logic in isolation with Sinon stubs
2. **Integration tests use real APIs**: Validate VS Code interactions with test harness
3. **Meaningful assertions**: Use `assert.strictEqual()`, never `assert.ok(true)` or weak checks
4. **Test one concept**: Each test validates one specific behavior
5. **Clear naming**: Test name should describe what is tested and what should happen

## Unit Testing with Mocks

### Stub VS Code APIs

```typescript
import * as sinon from "sinon";
import * as vscode from "vscode";

suite("FileIconService", () => {
  let registerCommandStub: sinon.SinonStub;

  setup(() => {
    // Stub only what you need to test the specific behavior
    registerCommandStub = sinon.stub(vscode.commands, "registerCommand");
  });

  teardown(() => {
    sinon.restore();
  });

  test("should register icon service on activation", () => {
    const service = new FileIconService();
    service.activate();

    // Verify exact call: count AND arguments
    assert.strictEqual(registerCommandStub.callCount, 1);
    assert.strictEqual(
      registerCommandStub.firstCall.args[0],
      "fileIconService.refresh",
    );
  });
});
```

### Create Mock Objects

```typescript
function createMockTab(overrides?: Partial<vscode.Tab>): vscode.Tab {
  return {
    label: "test.ts",
    isDirty: false,
    isPreview: false,
    group: { viewColumn: vscode.ViewColumn.One } as vscode.TabGroup,
    input: new vscode.TabInputText(vscode.Uri.file("/test.ts")),
    ...overrides,
  };
}

test("should infer TypeScript icon for code files", () => {
  const tab = createMockTab({
    label: "main.ts",
    input: new vscode.TabInputCustom(vscode.Uri.file("/main.ts"), "custom"),
  });

  const icon = service.inferTabIcon(tab);
  assert.strictEqual(icon.id, "file-code");
});
```

## Integration Testing with Test Harness

### Opening Documents and Editors

```typescript
test("should activate extension and register commands", async () => {
  // Execute in real VS Code instance with extension loaded
  const commands = await vscode.commands.getCommands();
  assert.ok(
    commands.includes("myExtension.myCommand"),
    "Command should be registered",
  );
});

test("should handle real tabs from open editors", async () => {
  // Create real document
  const doc = await vscode.workspace.openTextDocument({
    language: "typescript",
    content: "const x = 1;",
  });

  // Show in editor
  const editor = await vscode.window.showTextDocument(doc);
  assert.ok(vscode.window.activeTextEditor);

  // Access real tabs
  const tabs = vscode.window.tabGroups.all.flatMap((g) => g.tabs);
  assert.ok(tabs.length > 0);

  const tab = tabs[0];
  assert.strictEqual(tab.label, "Untitled-1");
  assert.strictEqual(tab.isDirty, false);
});
```

### Checking Tab Input Types

```typescript
test("should extract URI from different tab input types", async () => {
  const doc = await vscode.workspace.openTextDocument({
    language: "typescript",
    content: "test",
  });
  await vscode.window.showTextDocument(doc);

  const tab = vscode.window.tabGroups.all[0].tabs[0];

  if (tab.input instanceof vscode.TabInputText) {
    const uri = tab.input.uri;
    assert.ok(uri.path.includes("Untitled"));
  }
});
```

### Executing Commands

```typescript
test("should execute myExtension.open command", async () => {
  const result = await vscode.commands.executeCommand("myExtension.open");
  assert.ok(result);
});
```

## Unit vs. Integration: Decision Matrix

| Scenario                       | Use Unit Test  | Use Integration Test   |
| ------------------------------ | -------------- | ---------------------- |
| Testing helper/private methods | ✅             | ❌                     |
| Testing business logic         | ✅             | ❌                     |
| Testing command registration   | ✅ (with stub) | ✅ (verify in VS Code) |
| Testing real command execution | ❌             | ✅                     |
| Testing tab/editor management  | ❌             | ✅                     |
| Testing file operations        | ❌             | ✅                     |
| Testing quick pick UI          | ❌             | ✅                     |

## Recognizing and Fixing No-Op Tests

### ❌ Anti-Pattern: Testing Presence, Not Value

```typescript
// ❌ Passes if ANY icon exists, regardless of correctness
test("should return icon", () => {
  const icon = service.inferTabIcon(tab);
  assert.ok(icon); // What icon? Expected value is missing!
});

// ❌ Weak assertion - only checks existence
test("should have icon for .ts files", () => {
  const tab = createMockTab({ input: new vscode.TabInputCustom(...) });
  const icon = service.inferTabIcon(tab);
  assert.ok(icon, "Should have an icon"); // But WHICH icon?
});

// ❌ Doesn't validate actual expected behavior
test("should register command", () => {
  service.activate();
  assert.ok(stub.called); // How many times? What command?
});

// ❌ Testing the framework, not your code
test("should work", () => {
  assert.ok(1 === 1);
});
```

### ✅ Best Practice: Test Expected Values, Not Just Presence

Test for the **specific value** the user or system depends on, not just that _something_ exists:

```typescript
// ✅ Verify exact icon ID matches expected value
test("should return file-code icon for TypeScript", () => {
  const tab = createMockTab({
    input: new vscode.TabInputCustom(vscode.Uri.file("/main.ts"), "custom"),
  });
  const icon = service.inferTabIcon(tab);
  assert.strictEqual(
    icon.id,
    "file-code",
    "Should show code file icon for .ts",
  );
});

// ✅ Validate each file type returns its specific icon
test("should infer correct icons for different file types", () => {
  const expectedIcons = {
    ".ts": "file-code",
    ".json": "json",
    ".md": "markdown",
    ".py": "file-code",
  };

  for (const [ext, expectedIcon] of Object.entries(expectedIcons)) {
    const tab = createMockTab({
      input: new vscode.TabInputCustom(
        vscode.Uri.file(`/file${ext}`),
        "custom",
      ),
    });
    const icon = service.inferTabIcon(tab);
    assert.strictEqual(
      icon.id,
      expectedIcon,
      `File${ext} should display ${expectedIcon} icon`,
    );
  }
});

// ✅ Verify exact call count AND arguments
test("should register exactly two commands", () => {
  service.activate();
  assert.strictEqual(registerStub.callCount, 2);
  assert.strictEqual(registerStub.firstCall.args[0], "command.open");
  assert.strictEqual(registerStub.secondCall.args[0], "command.close");
});

// ✅ Assert state changed, not just that method was called
test("should disable quick pick on deactivation", () => {
  service.activate();
  assert.ok(service.quickPick);

  service.deactivate();
  assert.strictEqual(service.quickPick, null, "Quick pick should be disposed");
});
```

## Test File Scope and Avoiding Redundancy

Each test file should have a **single, well-defined responsibility**. Avoid testing the same behavior across multiple files.

### ✅ Best Practice: Clear Test Boundaries

**fileIconService.test.ts**: Tests only `FileIconService.inferTabIcon()`

- Icon inference for all tab types
- Extension-to-icon mapping
- Edge cases (empty label, case sensitivity, paths)
- NOT: How TabManager uses icons, command registration, extension activation

**tabManager.test.ts**: Tests only `TabManager` behavior

- Command registration (activation/deactivation)
- Quick pick state management
- Tab navigation and closing
- NOT: FileIconService internals, extension-level features

**extension.test.ts**: Tests only extension module

- Module exports (`activate`, `deactivate`)
- Command registration count and names
- Integration between TabManager and VS Code
- NOT: FileIconService details, TabManager internals

### ❌ Anti-Pattern: Testing Dependencies in Wrong File

```typescript
// ❌ WRONG: tabManager.test.ts testing FileIconService directly
suite("TabManager", () => {
  test("should infer correct icons for different file types", () => {
    // This EXACT test should be in fileIconService.test.ts only
    const extensions = [".ts", ".py", ".java", ".json"];
    for (const ext of extensions) {
      const tab = createMockTab({ input: new vscode.TabInputCustom(...) });
      const icon = iconService.inferTabIcon(tab);
      assert.strictEqual(icon.id, expectedIcon); // REDUNDANT
    }
  });
});
```

### ✅ Best Practice: Test Dependencies at Integration Points Only

```typescript
// ✅ RIGHT: tabManager.test.ts tests that icons appear in rendered items
suite("TabManager", () => {
  test("should build quick pick items with correct icons", () => {
    // Only test that TabManager USES icons correctly
    // Details of icon inference belong in FileIconService tests
    const mockTabs = [
      createMockTab({ label: "main.ts", input: new vscode.TabInputCustom(...) }),
      createMockTab({ label: "config.json", input: new vscode.TabInputCustom(...) }),
    ];

    // Verify TabManager retrieves icons for each tab (not values themselves)
    const icon1 = iconService.inferTabIcon(mockTabs[0]);
    const icon2 = iconService.inferTabIcon(mockTabs[1]);

    assert.ok(icon1, "Should have icon for first tab");
    assert.ok(icon2, "Should have icon for second tab");
    // Details like "icon1.id === 'file-code'" belong in FileIconService tests
  });
});
```

### Test Scope Summary

| Responsibility                  | Test File            | Coverage                              |
| ------------------------------- | -------------------- | ------------------------------------- |
| Icon inference logic            | fileIconService.test | All tab types, extensions, edge cases |
| TabManager state management     | tabManager.test      | Activation, quick pick, navigation    |
| Extension entry points          | extension.test       | activate/deactivate, command count    |
| Integration (TabManager + icon) | tabManager.test      | Icons used in items (not values)      |
| Integration (TabManager + ext)  | extension.test       | Commands registered and callable      |

## Best Practice: Strict, Specific Assertions

```typescript
// Verify exact value
test("should return file-code icon for TypeScript", () => {
  const icon = service.inferTabIcon(typeScriptTab);
  assert.strictEqual(icon.id, "file-code");
});

// Verify exact count and arguments
test("should register exactly two commands", () => {
  service.activate();
  assert.strictEqual(registerStub.callCount, 2);
  assert.strictEqual(registerStub.firstCall.args[0], "command1");
  assert.strictEqual(registerStub.secondCall.args[0], "command2");
});

// Verify behavior validated state change
test("should disable quick pick on deactivation", () => {
  service.activate();
  assert.ok(service.quickPick);

  service.deactivate();
  assert.strictEqual(service.quickPick, null);
});

// Loop with meaningful assertions - fails on first mismatch
test("should return file-code for all code files", () => {
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".py"];

  for (const ext of extensions) {
    const tab = createMockTab({
      input: new vscode.TabInputCustom(
        vscode.Uri.file(`/file${ext}`),
        "custom",
      ),
    });

    const icon = service.inferTabIcon(tab);
    assert.strictEqual(
      icon.id,
      "file-code",
      `Should return file-code for ${ext}`,
    );
  }
});
```

## Red-Green-Refactor with Meaningful Tests

1. **Red**: Write test with strict assertion that fails
2. **Green**: Implement to make test pass
3. **Refactor**: Improve while test validates correctness

```typescript
// 1. RED: Test fails - feature not implemented
test("should return json icon for CustomInput with .json files", () => {
  const tab = createMockTab({
    input: new vscode.TabInputCustom(vscode.Uri.file("/config.json"), "custom"),
  });

  const icon = service.inferTabIcon(tab);
  assert.strictEqual(icon.id, "json"); // ❌ Fails initially
});

// 2. GREEN: Implement to make test pass
export class FileIconService {
  private iconMap = new Map([
    [".json", "json"],
    [".ts", "file-code"],
  ]);

  inferTabIcon(tab: vscode.Tab): vscode.ThemeIcon {
    if (tab.input instanceof vscode.TabInputCustom) {
      const ext = extname(tab.input.uri.path).toLowerCase();
      const iconId = this.iconMap.get(ext);
      return new vscode.ThemeIcon(iconId || "file");
    }
    return vscode.ThemeIcon.File;
  }
}
// ✅ Test passes

// 3. REFACTOR: Improve implementation, test still validates
// Can refactor without breaking test
```

## Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- --grep "TabManager"

# Single test
npm test -- --grep "should register commands"

# With debugging
npm test -- --inspect-brk
```

## Assertion Messages: Improving Test Diagnostics

Assertion messages are crucial for debugging test failures. They should communicate what was expected, what was actually found, and why it matters. Include interpolated variable values to help diagnose issues quickly.

### ✅ Best Practice: Messages with Interpolated Values

```typescript
// ✅ Clear message with actual values for debugging
test("should preserve existing subscriptions when activating", () => {
  const subscriptions: vscode.Disposable[] = [
    { dispose: () => {} },
    { dispose: () => {} },
  ];
  const context = { subscriptions, extensionPath: "/mock/path" } as any;

  const initialLength = subscriptions.length;
  assert.strictEqual(
    initialLength,
    2,
    `Initial subscriptions should be 2, got: ${initialLength}`,
  );

  tabManager.activate(context);

  // Clear message showing expected vs actual
  assert.ok(
    subscriptions.length >= initialLength,
    `After activation, subscriptions (${subscriptions.length}) should be >= initial (${initialLength})`,
  );
});

// ✅ Loop messages with values show exactly which iteration failed
test("should return correct icons for all file types", () => {
  const fileTypeMap = {
    ".ts": "file-code",
    ".json": "json",
    ".md": "markdown",
  };

  for (const [extension, expectedIcon] of Object.entries(fileTypeMap)) {
    const tab = createMockTab({ label: `file${extension}` });
    const icon = service.inferTabIcon(tab);

    assert.strictEqual(
      icon.id,
      expectedIcon,
      `File with extension "${extension}" should have icon "${expectedIcon}", but got "${icon.id}"`,
    );
  }
});

// ✅ State change messages document what changed and why
test("should handle rapid cycles and remain in consistent state", () => {
  const cycles = 5;
  let cyclesCompleted = 0;

  assert.doesNotThrow(() => {
    for (let i = 0; i < cycles; i++) {
      tabManager.activate(context);
      tabManager.deactivate();
      cyclesCompleted++;
    }
  }, `Should handle ${cycles} rapid activate/deactivate cycles without errors`);

  assert.strictEqual(
    cyclesCompleted,
    cycles,
    `Expected ${cycles} complete cycles, completed: ${cyclesCompleted}`,
  );
});

// ✅ Stub verification with messages
test("should register command with correct callback", () => {
  service.activate();

  const callCount = registerStub.callCount;
  assert.strictEqual(
    callCount,
    1,
    `registerCommand should be called once, got ${callCount} calls`,
  );

  const commandName = registerStub.firstCall.args[0];
  assert.strictEqual(
    commandName,
    "editor-switcher.show",
    `Expected to register "editor-switcher.show", but registered "${commandName}"`,
  );
});
```

### ❌ Anti-Pattern: Weak or Missing Messages

```typescript
// ❌ No message at all
test("should activate", () => {
  assert.doesNotThrow(() => {
    tabManager.activate(context);
  });
});

// ❌ Generic message without values - hard to debug
test("should work", () => {
  assert.strictEqual(result, expected, "should be equal");
});

// ❌ Message doesn't help debugging
test("should register commands", () => {
  service.activate();
  assert.ok(registerStub.called);
  // No message, no information about what command or how many times
});

// ❌ Loop test with generic message - doesn't show which iteration failed
test("should have icons for files", () => {
  for (const ext of [".ts", ".json", ".py"]) {
    const tab = createMockTab({ label: `file${ext}` });
    const icon = service.inferTabIcon(tab);
    assert.ok(icon, "Should have icon"); // Which extension? What icon?
  }
});
```

## Pre-Submission Checklist

Before committing tests:

- [ ] Each test has meaningful assertion(s) - not `assert.ok()` or `assert.ok(true)`
- [ ] No no-op tests - assertions would fail if implementation is wrong
- [ ] **All assertions include messages with interpolated values** (expected, actual, iteration info)
- [ ] Messages document WHY the assertion matters, not just what failed
- [ ] Stub verification includes count AND arguments with clear messages
- [ ] Mock objects are realistic and match VS Code API types
- [ ] Integration tests clean up documents after use
- [ ] Unit tests restore all stubs in teardown
- [ ] Test names describe what is tested and expected behavior
- [ ] Loop-based tests include helpful failure messages with variable values
- [ ] State change tests verify both the action didn't throw AND the state changed
- [ ] All tests pass with current implementation

## Assertion Message Patterns

Use these patterns to write clear, diagnostic messages:

```typescript
// Pattern 1: Expected vs Actual (for value assertions)
assert.strictEqual(
  actual,
  expected,
  `Expected ${variable} to be "${expected}", but got "${actual}"`,
);

// Pattern 2: State change (before/after)
assert.ok(
  newValue >= oldValue,
  `Value should increase from ${oldValue} to >= ${newValue}, but got ${newValue}`,
);

// Pattern 3: Loop iteration context
assert.strictEqual(
  result[key],
  expected[key],
  `For key "${key}", expected "${expected[key]}" but got "${result[key]}"`,
);

// Pattern 4: Stub call verification
assert.strictEqual(
  stub.callCount,
  expected,
  `Stub should be called ${expected} times, but was called ${stub.callCount} times`,
);

// Pattern 5: Sequence/operation tracking
assert.strictEqual(
  step,
  expectedStep,
  `Expected to complete ${expectedStep} operations in sequence, completed: ${step}`,
);
```

See [references/REFERENCE.md](references/REFERENCE.md) for detailed API documentation and examples.
