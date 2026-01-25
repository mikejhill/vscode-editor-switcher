import * as vscode from "vscode";
import * as path from "path";

export class FileIconService {
  inferTabIcon(tab: vscode.Tab): vscode.ThemeIcon {
    const input = tab.input as any;
    let icon: vscode.ThemeIcon;

    if (!input) {
      // No input: Assume settings or similar
      icon = new vscode.ThemeIcon("settings-gear");
    } else if (input instanceof vscode.TabInputText) {
      icon = vscode.ThemeIcon.File;
    } else if (input instanceof vscode.TabInputTextDiff) {
      icon = new vscode.ThemeIcon("diff");
    } else if (input instanceof vscode.TabInputNotebook) {
      icon = new vscode.ThemeIcon("notebook");
    } else if (input instanceof vscode.TabInputNotebookDiff) {
      icon = new vscode.ThemeIcon("diff");
    } else if (input instanceof vscode.TabInputWebview) {
      icon = new vscode.ThemeIcon("browser");
    } else if (input instanceof vscode.TabInputTerminal) {
      icon = new vscode.ThemeIcon("terminal");
    } else if (input instanceof vscode.TabInputCustom) {
      const maybeUri: vscode.Uri | undefined = input?.uri;
      icon =
        (maybeUri ? this.iconForUri(maybeUri) : undefined) ??
        this.iconForCustomViewType(input?.viewType) ??
        new vscode.ThemeIcon("extensions");
    } else {
      // Handle "unknown" (unrecognized) input types
      const uri = input?.uri ?? input?.modified ?? input?.original ?? undefined;
      icon = uri
        ? (this.iconForUri(uri) ?? vscode.ThemeIcon.File)
        : new vscode.ThemeIcon("symbol-file");
    }

    return icon;
  }

  private iconForCustomViewType(
    viewType: string | undefined,
  ): vscode.ThemeIcon | undefined {
    if (!viewType) {
      return;
    }

    switch (viewType) {
      case "vscode.markdown.preview":
        return new vscode.ThemeIcon("markdown");
      default:
        return;
    }
  }

  private iconForUri(uri: vscode.Uri): vscode.ThemeIcon | undefined {
    switch (uri.scheme) {
      case "vscode-terminal":
        return new vscode.ThemeIcon("terminal");
      case "vscode-notebook":
        return new vscode.ThemeIcon("notebook");
      case "output":
        return new vscode.ThemeIcon("output");
      case "git":
        return new vscode.ThemeIcon("source-control");
    }

    const ext = path.extname(uri.path).toLowerCase();

    if (
      [
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
      ].includes(ext)
    ) {
      return new vscode.ThemeIcon("file-code");
    }

    if ([".json", ".jsonc"].includes(ext)) {
      return new vscode.ThemeIcon("json");
    }
    if ([".yml", ".yaml"].includes(ext)) {
      return new vscode.ThemeIcon("symbol-key");
    }
    if ([".md", ".markdown"].includes(ext)) {
      return new vscode.ThemeIcon("markdown");
    }
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) {
      return new vscode.ThemeIcon("file-media");
    }
    if ([".pdf"].includes(ext)) {
      return new vscode.ThemeIcon("file-pdf");
    }
    if ([".zip", ".7z", ".tar", ".gz"].includes(ext)) {
      return new vscode.ThemeIcon("file-zip");
    }
    if ([".log", ".txt"].includes(ext)) {
      return new vscode.ThemeIcon("file-text");
    }

    return;
  }
}
