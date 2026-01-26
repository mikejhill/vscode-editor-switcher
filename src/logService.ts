import * as vscode from "vscode";

export interface ILogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
  dispose(): void;
  readonly outputChannel?: vscode.LogOutputChannel;
}

export class LogService implements ILogger {
  private readonly channel: vscode.LogOutputChannel;

  constructor(name: string) {
    this.channel = vscode.window.createOutputChannel(name, { log: true });
  }

  public debug(message: string): void {
    this.channel.debug(message);
  }

  public info(message: string): void {
    this.channel.info(message);
  }

  public warn(message: string): void {
    this.channel.warn(message);
  }

  public error(message: string, error?: unknown): void {
    if (error === undefined) {
      this.channel.error(message);
      return;
    }

    const details = this.formatError(error);
    this.channel.error(`${message}: ${details}`);
  }

  public dispose(): void {
    this.channel.dispose();
  }

  public get outputChannel(): vscode.LogOutputChannel {
    return this.channel;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.message}${error.stack ? `\n${error.stack}` : ""}`;
    }
    return String(error);
  }
}
