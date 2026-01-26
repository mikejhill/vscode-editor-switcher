import * as vscode from "vscode";
import { TabManager } from "./tabManager";
import { FileIconService } from "./fileIconService";
import { LogService } from "./logService";

let tabManager: TabManager | undefined;
let logService: LogService | undefined;

export function activate(context: vscode.ExtensionContext): void {
  logService = new LogService("Editor Switcher");
  const fileIconService = new FileIconService(logService);
  tabManager = new TabManager(fileIconService, logService);

  context.subscriptions.push(logService);
  tabManager.activate(context);
}

export function deactivate(): void {
  tabManager?.deactivate();
  tabManager = undefined;
  logService?.dispose();
  logService = undefined;
}
