import * as vscode from "vscode";
import * as path from "path";
import { ILogger } from "./logService";

export class FileIconService {
  constructor(private readonly log: ILogger) {}

  inferTabIcon(tab: vscode.Tab): vscode.ThemeIcon {
    const input = tab.input as any;
    let icon: vscode.ThemeIcon;
    const tabLabel = tab.label ?? "unknown";

    if (!input) {
      // No input: Assume settings or similar
      this.log.debug(`Tab "${tabLabel}": no input, using settings-gear icon`);
      icon = new vscode.ThemeIcon("settings-gear");
    } else if (input instanceof vscode.TabInputText) {
      this.log.debug(`Tab "${tabLabel}": TabInputText, using file icon`);
      icon = vscode.ThemeIcon.File;
    } else if (input instanceof vscode.TabInputTextDiff) {
      this.log.debug(`Tab "${tabLabel}": TabInputTextDiff, using diff icon`);
      icon = new vscode.ThemeIcon("diff");
    } else if (input instanceof vscode.TabInputNotebook) {
      this.log.debug(
        `Tab "${tabLabel}": TabInputNotebook, using notebook icon`,
      );
      icon = new vscode.ThemeIcon("notebook");
    } else if (input instanceof vscode.TabInputNotebookDiff) {
      this.log.debug(
        `Tab "${tabLabel}": TabInputNotebookDiff, using diff icon`,
      );
      icon = new vscode.ThemeIcon("diff");
    } else if (input instanceof vscode.TabInputWebview) {
      this.log.debug(`Tab "${tabLabel}": TabInputWebview, using browser icon`);
      icon = new vscode.ThemeIcon("browser");
    } else if (input instanceof vscode.TabInputTerminal) {
      this.log.debug(
        `Tab "${tabLabel}": TabInputTerminal, using terminal icon`,
      );
      icon = new vscode.ThemeIcon("terminal");
    } else if (input instanceof vscode.TabInputCustom) {
      const maybeUri: vscode.Uri | undefined = input?.uri;
      this.log.debug(
        `Tab "${tabLabel}": TabInputCustom with viewType "${input?.viewType}"`,
      );
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

      const inputType = input?.constructor?.name ?? "unknown";
      this.log.debug(
        `Tab "${tabLabel}": Using fallback icon for unrecognized tab input type: ${inputType}`,
      );
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
