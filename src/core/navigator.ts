import * as vscode from "vscode";
import type { IntelliJAction } from "../types";
import { goToDeclarationOrUsages } from "../navigation/go-to-declaration";
import { runRefactor } from "../refactor/run-refactor";
import { migrateLegacySettings } from "./migrate-settings";
import { Logger } from "./logger";

/**
 * Orchestrator for all IntelliJ Navigation commands.
 *
 * Owns the Logger lifetime and tracks `latestRequestId` for stale-request
 * detection in goToDeclarationOrUsages. Command handlers themselves are
 * pure functions in their respective domains (navigation/, refactor/).
 */
export class IntelliJNavigator implements vscode.Disposable {
  private readonly logger = new Logger();
  private latestRequestId = 0;

  public dispose(): void {
    this.logger.dispose();
  }

  public goToDeclarationOrUsages(): Promise<void> {
    return goToDeclarationOrUsages(
      {
        bumpRequestId: () => ++this.latestRequestId,
        getLatestRequestId: () => this.latestRequestId,
      },
      this.logger,
    );
  }

  public runRefactor(action: IntelliJAction): Promise<void> {
    return runRefactor(action, this.logger);
  }

  public migrateLegacySettings(): Promise<void> {
    return migrateLegacySettings(this.logger);
  }
}
