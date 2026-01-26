import * as assert from "assert";
import * as vscode from "vscode";
import { FileIconService } from "../fileIconService";

/**
 * Helper function for creating mock tabs
 */
function createMockTab(
  options: { label?: string; input?: any } = {},
): vscode.Tab {
  const label = options.label ?? "test.ts";
  const input = Object.prototype.hasOwnProperty.call(options, "input")
    ? options.input
    : new vscode.TabInputText(vscode.Uri.file("/path/test.ts"));

  return {
    label,
    isActive: false,
    isDirty: false,
    input,
    isPreview: false,
    group: {
      viewColumn: 1,
      tabs: [],
      isActive: true,
      activeTab: undefined,
    } as any,
  } as any;
}

/**
 * FileIconService Tests
 * Tests icon inference for different tab types and file extensions
 */
suite("FileIconService", () => {
  let iconService: FileIconService;

  setup(() => {
    iconService = new FileIconService();
  });

  suite("inferTabIcon", () => {
    suite("for TabInputText", () => {
      test("should return generic File icon for TabInputText regardless of extension", () => {
        const tab = createMockTab({
          input: new vscode.TabInputText(vscode.Uri.file("/path/file.ts")),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(
          icon.id,
          "file",
          "TabInputText returns generic file icon (not specialized by extension)",
        );
      });
    });

    suite("for specialized file extensions via CustomInput", () => {
      test("should return file-code icon for supported code files", () => {
        const codeExtensions = [
          ".ts",
          ".tsx",
          ".js",
          ".jsx",
          ".java",
          ".kt",
          ".py",
          ".go",
          ".rs",
          ".cs",
          ".cpp",
          ".c",
          ".h",
        ];

        for (const ext of codeExtensions) {
          const tab = createMockTab({
            input: new vscode.TabInputCustom(
              vscode.Uri.file(`/path/file${ext}`),
              "custom-type",
            ),
          });
          const icon = iconService.inferTabIcon(tab);
          assert.strictEqual(
            icon.id,
            "file-code",
            `Should return file-code icon for ${ext}`,
          );
        }
      });

      test("should return json icon for .json and .jsonc files", () => {
        const jsonExtensions = [".json", ".jsonc"];
        for (const ext of jsonExtensions) {
          const tab = createMockTab({
            input: new vscode.TabInputCustom(
              vscode.Uri.file(`/path/file${ext}`),
              "custom-type",
            ),
          });
          const icon = iconService.inferTabIcon(tab);
          assert.strictEqual(
            icon.id,
            "json",
            `Should return json icon for ${ext}`,
          );
        }
      });

      test("should return markdown icon for .md files", () => {
        const tab = createMockTab({
          input: new vscode.TabInputCustom(
            vscode.Uri.file("/path/file.md"),
            "custom-type",
          ),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "markdown");
      });

      test("should return file-media icon for image files", () => {
        const imageExtensions = [
          ".png",
          ".jpg",
          ".jpeg",
          ".gif",
          ".webp",
          ".svg",
        ];
        for (const ext of imageExtensions) {
          const tab = createMockTab({
            input: new vscode.TabInputCustom(
              vscode.Uri.file(`/path/file${ext}`),
              "custom-type",
            ),
          });
          const icon = iconService.inferTabIcon(tab);
          assert.strictEqual(
            icon.id,
            "file-media",
            `Should return file-media icon for ${ext}`,
          );
        }
      });

      test("should return file-pdf icon for .pdf files", () => {
        const tab = createMockTab({
          input: new vscode.TabInputCustom(
            vscode.Uri.file("/path/file.pdf"),
            "custom-type",
          ),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "file-pdf");
      });

      test("should return file-zip icon for archive files", () => {
        const archiveExtensions = [".zip", ".7z", ".tar", ".gz"];
        for (const ext of archiveExtensions) {
          const tab = createMockTab({
            input: new vscode.TabInputCustom(
              vscode.Uri.file(`/path/file${ext}`),
              "custom-type",
            ),
          });
          const icon = iconService.inferTabIcon(tab);
          assert.strictEqual(
            icon.id,
            "file-zip",
            `Should return file-zip icon for ${ext}`,
          );
        }
      });

      test("should return file-text icon for .txt and .log files", () => {
        const textExtensions = [".txt", ".log"];
        for (const ext of textExtensions) {
          const tab = createMockTab({
            input: new vscode.TabInputCustom(
              vscode.Uri.file(`/path/file${ext}`),
              "custom-type",
            ),
          });
          const icon = iconService.inferTabIcon(tab);
          assert.strictEqual(
            icon.id,
            "file-text",
            `Should return file-text icon for ${ext}`,
          );
        }
      });

      test("should return symbol-key icon for yaml files", () => {
        const yamlExtensions = [".yml", ".yaml"];
        for (const ext of yamlExtensions) {
          const tab = createMockTab({
            input: new vscode.TabInputCustom(
              vscode.Uri.file(`/path/file${ext}`),
              "custom-type",
            ),
          });
          const icon = iconService.inferTabIcon(tab);
          assert.strictEqual(
            icon.id,
            "symbol-key",
            `Should return symbol-key icon for ${ext}`,
          );
        }
      });

      test("should return extensions fallback for unknown extensions", () => {
        const tab = createMockTab({
          input: new vscode.TabInputCustom(
            vscode.Uri.file("/path/file.xyz123"),
            "unknown-type",
          ),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(
          icon.id,
          "extensions",
          "Should return extensions icon for unknown extension",
        );
      });
    });

    suite("for specialized tab types", () => {
      test("should return diff icon for TabInputTextDiff", () => {
        const tab = createMockTab({
          input: new vscode.TabInputTextDiff(
            vscode.Uri.file("/path/original.ts"),
            vscode.Uri.file("/path/modified.ts"),
          ),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "diff");
      });

      test("should return notebook icon for TabInputNotebook", () => {
        const tab = createMockTab({
          input: new vscode.TabInputNotebook(
            vscode.Uri.file("/path/notebook.ipynb"),
            "jupyter-notebook",
          ),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "notebook");
      });

      test("should return browser icon for TabInputWebview", () => {
        const tab = createMockTab({
          input: new vscode.TabInputWebview("webview-id"),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "browser");
      });

      test("should return terminal icon for TabInputTerminal", () => {
        const tab = createMockTab({
          input: new vscode.TabInputTerminal(),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "terminal");
      });

      test("should return diff icon for TabInputNotebookDiff", () => {
        const tab = createMockTab({
          input: new vscode.TabInputNotebookDiff(
            vscode.Uri.file("/path/original.ipynb"),
            vscode.Uri.file("/path/modified.ipynb"),
            "jupyter-notebook",
          ),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(
          icon.id,
          "diff",
          "Should return diff icon for notebook diffs",
        );
      });
    });

    suite("for URI schemes", () => {
      test("should return terminal icon for vscode-terminal scheme", () => {
        const tab = createMockTab({
          input: { uri: vscode.Uri.parse("vscode-terminal://terminal-id") },
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "terminal");
      });

      test("should return notebook icon for vscode-notebook scheme", () => {
        const tab = createMockTab({
          input: { uri: vscode.Uri.parse("vscode-notebook://notebook-id") },
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "notebook");
      });

      test("should return output icon for output scheme", () => {
        const tab = createMockTab({
          input: { uri: vscode.Uri.parse("output://output-id") },
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "output");
      });

      test("should return source-control icon for git scheme", () => {
        const tab = createMockTab({
          input: { uri: vscode.Uri.parse("git://git-id") },
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "source-control");
      });
    });

    suite("for custom views", () => {
      test("should return markdown icon for markdown preview view type", () => {
        const tab = createMockTab({
          input: new vscode.TabInputCustom(
            vscode.Uri.file("/path/file.md"),
            "vscode.markdown.preview",
          ),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "markdown");
      });

      test("should return extensions icon for unknown custom view types", () => {
        const tab = createMockTab({
          input: new vscode.TabInputCustom(
            vscode.Uri.file("/path/file.custom"),
            "unknown-view-type",
          ),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "extensions");
      });

      test("should return settings-gear icon for undefined input", () => {
        const tab = createMockTab({ input: undefined });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(icon.id, "settings-gear");
      });

      test("should prioritize URI scheme over custom view type", () => {
        const tab = createMockTab({
          input: new vscode.TabInputCustom(
            vscode.Uri.parse("output://output-id"),
            "vscode.markdown.preview",
          ),
        });
        const icon = iconService.inferTabIcon(tab);
        assert.strictEqual(
          icon.id,
          "output",
          "Should use URI scheme icon over viewType icon",
        );
      });
    });
  });
});

/**
 * FileIconService Edge Cases and Special Scenarios
 */
suite("FileIconService - Edge Cases", () => {
  let iconService: FileIconService;

  setup(() => {
    iconService = new FileIconService();
  });

  test("should handle uppercase file extensions", () => {
    const tab = createMockTab({
      input: new vscode.TabInputCustom(
        vscode.Uri.file("/path/file.TS"),
        "custom-type",
      ),
    });
    const icon = iconService.inferTabIcon(tab);
    assert.strictEqual(
      icon.id,
      "file-code",
      "Should recognize uppercase .TS as TypeScript",
    );
  });

  test("should handle files with multiple dots in name", () => {
    const tab = createMockTab({
      input: new vscode.TabInputCustom(
        vscode.Uri.file("/path/file.test.ts"),
        "custom-type",
      ),
    });
    const icon = iconService.inferTabIcon(tab);
    assert.strictEqual(
      icon.id,
      "file-code",
      "Should infer extension from final dot",
    );
  });

  test("should return file icon for files with no extension", () => {
    const tab = createMockTab({
      input: new vscode.TabInputText(vscode.Uri.file("/path/Dockerfile")),
    });
    const icon = iconService.inferTabIcon(tab);
    assert.strictEqual(
      icon.id,
      "file",
      "Should return generic file icon for no extension",
    );
  });

  test("should handle relative and absolute paths equally", () => {
    const absoluteUri = vscode.Uri.file("/absolute/path/file.ts");
    const relativeUri = vscode.Uri.file("relative/path/file.ts");

    const tab1 = createMockTab({
      input: new vscode.TabInputCustom(absoluteUri, "custom-type"),
    });
    const tab2 = createMockTab({
      input: new vscode.TabInputCustom(relativeUri, "custom-type"),
    });

    const icon1 = iconService.inferTabIcon(tab1);
    const icon2 = iconService.inferTabIcon(tab2);

    assert.strictEqual(
      icon1.id,
      icon2.id,
      "Should return same icon regardless of path type",
    );
    assert.strictEqual(
      icon1.id,
      "file-code",
      "Should correctly infer code icon for TypeScript",
    );
  });

  test("should handle Windows paths with backslashes", () => {
    const tab = createMockTab({
      input: new vscode.TabInputCustom(
        vscode.Uri.file("C:\\Users\\test\\file.ts"),
        "custom-type",
      ),
    });
    const icon = iconService.inferTabIcon(tab);
    assert.strictEqual(icon.id, "file-code", "Should handle Windows paths");
  });

  test("should return extensions fallback for CustomInput with unsupported extensions", () => {
    const tab = createMockTab({
      input: new vscode.TabInputCustom(
        vscode.Uri.file("/path/file.xyz123"),
        "unknown-type",
      ),
    });
    const icon = iconService.inferTabIcon(tab);
    assert.strictEqual(
      icon.id,
      "extensions",
      "Should return extensions icon for unknown extension",
    );
  });

  test("should handle all supported code file extensions", () => {
    const codeExtensions = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".java",
      ".kt",
      ".py",
      ".go",
      ".rs",
      ".cs",
      ".cpp",
      ".c",
      ".h",
    ];

    for (const ext of codeExtensions) {
      const tab = createMockTab({
        input: new vscode.TabInputCustom(
          vscode.Uri.file(`/path/file${ext}`),
          "custom-type",
        ),
      });
      const icon = iconService.inferTabIcon(tab);
      assert.strictEqual(
        icon.id,
        "file-code",
        `Should recognize ${ext} as code file`,
      );
    }
  });

  test("should return diff icon for TabInputNotebookDiff", () => {
    const tab = createMockTab({
      input: new vscode.TabInputNotebookDiff(
        vscode.Uri.file("/path/original.ipynb"),
        vscode.Uri.file("/path/modified.ipynb"),
        "jupyter-notebook",
      ),
    });

    const icon = iconService.inferTabIcon(tab);
    assert.strictEqual(
      icon.id,
      "diff",
      "Should return diff icon for notebook diffs",
    );
  });

  test("should infer specialized icons from custom inputs with file URIs", () => {
    const tab = createMockTab({
      input: new vscode.TabInputCustom(
        vscode.Uri.file("/path/file.json"),
        "unknown-type",
      ),
    });
    const icon = iconService.inferTabIcon(tab);
    assert.strictEqual(
      icon.id,
      "json",
      "Should return json icon when iconForUri matches",
    );
  });
});
