# VS Code Extension Testing Reference

Detailed API documentation and examples for VS Code extension testing.

## VS Code Test Harness APIs

### vscode.commands

Execute and register commands.

```typescript
// Get all registered commands
const commands = await vscode.commands.getCommands();

// Execute command
const result = await vscode.commands.executeCommand('command.id', arg1, arg2);

// Register command (usually in extension activation)
const disposable = vscode.commands.registerCommand('myExt.myCommand', () => {
  vscode.window.showInformationMessage('Command executed');
});
```

### vscode.window.tabGroups

Access open editors and tabs.

```typescript
// Get all tab groups
const allGroups = vscode.window.tabGroups.all;

// Get tabs in all groups
const allTabs = vscode.window.tabGroups.all
  .flatMap(group => group.tabs);

// Access specific tab
const tab = allTabs[0];
console.log(tab.label);        // File name
console.log(tab.isDirty);      // Unsaved?
console.log(tab.isPreview);    // Preview tab?
console.log(tab.group);        // Parent TabGroup
```

### vscode.workspace

Open and manage documents.

```typescript
// Open document from file
const doc = await vscode.workspace.openTextDocument(
  vscode.Uri.file('/path/to/file.ts')
);

// Open untitled document with content
const doc = await vscode.workspace.openTextDocument({
  language: 'typescript',
  content: 'const x = 1;',
});

// Access document properties
doc.getText();           // Full content
doc.languageId;          // Language mode
doc.isDirty;             // Unsaved changes?
doc.uri;                 // File URI
```

### vscode.window

Manage the editor UI.

```typescript
// Show document in editor
const editor = await vscode.window.showTextDocument(doc);

// Get active editor
const editor = vscode.window.activeTextEditor;
if (editor) {
  const doc = editor.document;
  const selection = editor.selection;
}

// Show information/warning/error message
await vscode.window.showInformationMessage('Info');
await vscode.window.showWarningMessage('Warning');
await vscode.window.showErrorMessage('Error');

// Show quick pick
const selected = await vscode.window.showQuickPick(['Option 1', 'Option 2']);

// Show input box
const input = await vscode.window.showInputBox({
  prompt: 'Enter something',
  placeHolder: 'default value',
});
```

## Tab Input Types

Each tab has an `input` property that determines its type and how to access the URI.

```typescript
// TabInputText: Regular file editor
if (tab.input instanceof vscode.TabInputText) {
  const uri = tab.input.uri;  // File path
}

// TabInputCustom: Custom editors with custom URI
if (tab.input instanceof vscode.TabInputCustom) {
  const uri = tab.input.uri;       // Custom URI
  const viewType = tab.input.viewType;  // Custom view ID
}

// TabInputTextDiff: Diff editor
if (tab.input instanceof vscode.TabInputTextDiff) {
  const uri1 = tab.input.modified;
  const uri2 = tab.input.original;
}

// TabInputNotebook: Notebook editor
if (tab.input instanceof vscode.TabInputNotebook) {
  const uri = tab.input.uri;
}

// TabInputWebview: Webview editor
if (tab.input instanceof vscode.TabInputWebview) {
  const viewType = tab.input.viewType;
}

// TabInputTerminal: Terminal panel
if (tab.input instanceof vscode.TabInputTerminal) {
  // Terminal - access via terminal API
}
```

## Sinon Stubbing Reference

Mock and verify VS Code API calls.

```typescript
import * as sinon from 'sinon';
import * as vscode from 'vscode';

// Create stub
const stub = sinon.stub(vscode.commands, 'registerCommand');

// Verify it was called
assert.ok(stub.called);

// Verify call count
assert.strictEqual(stub.callCount, 2);

// Verify call arguments
assert.strictEqual(stub.firstCall.args[0], 'commandId');
assert.strictEqual(stub.secondCall.args[0], 'commandId2');

// Verify not called
assert.ok(!stub.called);

// Restore original function
stub.restore();

// Or restore all stubs at once
sinon.restore();
```

## Common Test Patterns

### Testing Command Registration

```typescript
suite('Command Registration', () => {
  let registerStub: sinon.SinonStub;

  setup(() => {
    registerStub = sinon.stub(vscode.commands, 'registerCommand');
  });

  teardown(() => {
    sinon.restore();
  });

  test('should register extension commands on activation', () => {
    const extension = new MyExtension();
    extension.activate();

    assert.strictEqual(registerStub.callCount, 3);
    assert.strictEqual(registerStub.getCall(0).args[0], 'myExt.command1');
    assert.strictEqual(registerStub.getCall(1).args[0], 'myExt.command2');
    assert.strictEqual(registerStub.getCall(2).args[0], 'myExt.command3');
  });
});
```

### Testing Icon Selection by File Extension

```typescript
function createMockTab(
  filename: string,
  extension: string
): vscode.Tab {
  return {
    label: filename,
    isDirty: false,
    isPreview: false,
    group: { viewColumn: vscode.ViewColumn.One } as vscode.TabGroup,
    input: new vscode.TabInputCustom(
      vscode.Uri.file(`/path/${filename}${extension}`),
      'custom'
    ),
  };
}

test('should return correct icon for file extensions', () => {
  const testCases = [
    ('main.ts', 'file-code'),
    ('config.json', 'json'),
    ('README.md', 'markdown'),
    ('image.png', 'file-media'),
  ];

  for (const [filename, expectedIcon] of testCases) {
    const [name, ext] = filename.split('.');
    const tab = createMockTab(name, `.${ext}`);

    const icon = service.inferTabIcon(tab);
    assert.strictEqual(
      icon.id,
      expectedIcon,
      `Should return ${expectedIcon} for .${ext}`
    );
  }
});
```

### Testing with Real Editors

```typescript
test('should switch between open editors', async () => {
  // Create two documents
  const doc1 = await vscode.workspace.openTextDocument({
    language: 'typescript',
    content: 'file 1',
  });
  const doc2 = await vscode.workspace.openTextDocument({
    language: 'typescript',
    content: 'file 2',
  });

  // Show first editor
  await vscode.window.showTextDocument(doc1);
  assert.strictEqual(vscode.window.activeTextEditor?.document, doc1);

  // Switch to second editor
  await vscode.window.showTextDocument(doc2);
  assert.strictEqual(vscode.window.activeTextEditor?.document, doc2);

  // Switch back to first
  await vscode.window.showTextDocument(doc1);
  assert.strictEqual(vscode.window.activeTextEditor?.document, doc1);
});
```

### Testing State Management

```typescript
test('should initialize and cleanup state on activate/deactivate', () => {
  const manager = new TabManager();

  // Initially inactive
  assert.strictEqual(manager.isActive, false);

  // Activate
  manager.activate();
  assert.strictEqual(manager.isActive, true);
  assert.ok(manager.quickPick);

  // Deactivate
  manager.deactivate();
  assert.strictEqual(manager.isActive, false);
  assert.strictEqual(manager.quickPick, null);

  // Should be idempotent
  assert.doesNotThrow(() => manager.deactivate());
});
```

## File Path Handling

When creating mock tabs with file URIs, be aware of platform differences:

```typescript
// Cross-platform file URI
const uri = vscode.Uri.file('/path/to/file.ts');

// URI path is always forward slashes
assert.ok(uri.path.includes('/'));

// File extension handling
import { extname } from 'path';

const ext = extname(uri.path);  // '.ts'
const extLower = extname(uri.path).toLowerCase();  // handles '.TS'

// Windows paths in URIs still use forward slashes
const windowsUri = vscode.Uri.file('C:\\Users\\file.ts');
assert.ok(windowsUri.path.includes('/'));  // Still has forward slashes
```

## Debugging Tips

### Print Test Output

```typescript
test('debug test', () => {
  const value = service.getValue();
  console.log('Current value:', value);  // Shows in test output

  assert.strictEqual(value, expected);
});
```

### Isolate Single Test

```typescript
// Run only this test (not others)
test.only('should do something', () => {
  // Test runs in isolation
});
```

### Run Specific Tests

```bash
# Run tests matching pattern
npm test -- --grep "should register"

# Run single file
npm test -- src/test/myService.test.ts
```

### Inspect Stub Calls

```typescript
// Log all calls to a stub
stub.getCalls().forEach(call => {
  console.log('Call:', call.args);
});

// Verify specific call by index
const call = stub.getCall(0);
console.log('First call args:', call.args);
```
