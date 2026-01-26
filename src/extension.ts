import * as vscode from "vscode";
import { TabManager } from "./tabManager";
import { FileIconService } from "./fileIconService";
import { LogService } from "./logService";

let tabManager: TabManager | undefined;
let logService: LogService | undefined;

export function activate(context: vscode.ExtensionContext): void {
  logService = new LogService("Editor Switcher");
  logService.info("Activating Editor Switcher extension");

  const fileIconService = new FileIconService(logService);
  tabManager = new TabManager(fileIconService, logService);

  context.subscriptions.push(logService);

  // Register commands
  const openDisposable = vscode.commands.registerCommand(
    "editorSwitcher.open",
    async () => {
      try {
        await tabManager?.showQuickPick();
      } catch (error) {
        logService?.error("Failed to open editor switcher", error);
      }
    },
  );

  const closeDisposable = vscode.commands.registerCommand(
    "editorSwitcher.closeSelected",
    async () => {
      try {
        await tabManager?.closeHighlighted();
      } catch (error) {
        logService?.error("Failed to close highlighted tab", error);
      }
    },
  );

  context.subscriptions.push(openDisposable, closeDisposable);
  tabManager.activate(context);
  logService.info("Editor Switcher extension activated successfully");
}

export function deactivate(): void {
  logService?.info("Deactivating Editor Switcher extension");
  tabManager?.deactivate();
  tabManager = undefined;
  logService?.dispose();
  logService = undefined;
}
