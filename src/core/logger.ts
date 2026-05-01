import * as vscode from "vscode";

const OUTPUT_CHANNEL_NAME = "Custom IntelliJ Navigation";
const STATUS_MESSAGE_TIMEOUT_MS = 2500;

/**
 * Thin wrapper around vscode.OutputChannel + status bar.
 *
 * Owns the lifetime of the output channel — must be added to extension
 * subscriptions so dispose() runs on deactivate.
 */
export class Logger implements vscode.Disposable {
  private readonly output =
    vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

  public dispose(): void {
    this.output.dispose();
  }

  /** Append timestamped message to the Output channel. */
  public log(message: string): void {
    this.output.appendLine(`[${new Date().toISOString()}] ${message}`);
  }

  /**
   * Brief status bar message + log entry. Use for transient user-facing
   * notices that don't warrant an interruption.
   */
  public showStatus(message: string): void {
    this.log(message);
    vscode.window.setStatusBarMessage(message, STATUS_MESSAGE_TIMEOUT_MS);
  }
}
