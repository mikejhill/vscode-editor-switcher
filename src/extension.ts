import * as vscode from "vscode";
import { TabManager } from "./tabManager";
import { FileIconService } from "./fileIconService";

const tabManager = new TabManager(new FileIconService());

export function activate(context: vscode.ExtensionContext): void {
  tabManager.activate(context);
}

export function deactivate(): void {
  tabManager.deactivate();
}
