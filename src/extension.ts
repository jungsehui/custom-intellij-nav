import * as vscode from "vscode";

const COMMAND_ID = "intellij.goToDeclarationOrUsages";
const OUTPUT_CHANNEL_NAME = "Custom IntelliJ Navigation";
const STATUS_MESSAGE_TIMEOUT_MS = 2500;

type RawLocation = vscode.Location | vscode.LocationLink;
type ProviderCommand =
  | "vscode.executeDeclarationProvider"
  | "vscode.executeDefinitionProvider";
type ProviderSource = "declaration" | "definition";

interface EditorSnapshot {
  readonly uri: vscode.Uri;
  readonly version: number;
  readonly position: vscode.Position;
}

interface ProviderResolution {
  readonly source: ProviderSource;
  readonly all: vscode.Location[];
  readonly external: vscode.Location[];
}

function captureSnapshot(editor: vscode.TextEditor): EditorSnapshot {
  return {
    uri: editor.document.uri,
    version: editor.document.version,
    position: editor.selection.active,
  };
}

function isLocationLink(item: RawLocation): item is vscode.LocationLink {
  return "targetUri" in item;
}

function toLocation(item: RawLocation): vscode.Location {
  if (isLocationLink(item)) {
    return new vscode.Location(
      item.targetUri,
      item.targetSelectionRange ?? item.targetRange,
    );
  }

  return new vscode.Location(item.uri, item.range);
}

function locationKey(location: vscode.Location): string {
  return [
    location.uri.toString(),
    location.range.start.line,
    location.range.start.character,
    location.range.end.line,
    location.range.end.character,
  ].join(":");
}

function dedupeLocations(
  locations: readonly vscode.Location[],
): vscode.Location[] {
  const seen = new Set<string>();
  const unique: vscode.Location[] = [];

  for (const location of locations) {
    const key = locationKey(location);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(location);
  }

  return unique;
}

function normalizeLocations(items: readonly RawLocation[]): vscode.Location[] {
  return dedupeLocations(items.map(toLocation));
}

function isCurrentLocation(
  snapshot: EditorSnapshot,
  location: vscode.Location,
): boolean {
  return (
    location.uri.toString() === snapshot.uri.toString() &&
    location.range.contains(snapshot.position)
  );
}

function pickGotoBehavior(
  locations: readonly vscode.Location[],
): "goto" | "gotoAndPeek" {
  return locations.length > 1 ? "gotoAndPeek" : "goto";
}

class IntelliJNavigator implements vscode.Disposable {
  private readonly output =
    vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  private latestRequestId = 0;

  public dispose(): void {
    this.output.dispose();
  }

  public async goToDeclarationOrUsages(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const snapshot = captureSnapshot(editor);
    const requestId = ++this.latestRequestId;
    const startedAt = Date.now();

    this.log(
      `request#${requestId} start ${snapshot.uri.toString()}@${snapshot.position.line}:${snapshot.position.character}`,
    );

    try {
      const declaration = await this.resolveProvider(
        requestId,
        snapshot,
        "declaration",
        "vscode.executeDeclarationProvider",
      );

      if (this.isStale(requestId, snapshot)) {
        return;
      }

      if (declaration) {
        if (declaration.external.length > 0) {
          await this.navigate(
            snapshot,
            declaration.source,
            declaration.external,
          );
          return;
        }

        const usagesShown = await this.peekUsages(requestId, snapshot);
        if (!usagesShown) {
          this.showStatus("No usages found");
        }
        return;
      }

      const definition = await this.resolveProvider(
        requestId,
        snapshot,
        "definition",
        "vscode.executeDefinitionProvider",
      );

      if (this.isStale(requestId, snapshot)) {
        return;
      }

      if (definition) {
        if (definition.external.length > 0) {
          await this.navigate(snapshot, definition.source, definition.external);
          return;
        }

        const usagesShown = await this.peekUsages(requestId, snapshot);
        if (!usagesShown) {
          this.showStatus("No usages found");
        }
        return;
      }

      const usagesShown = await this.peekUsages(requestId, snapshot);
      if (!usagesShown) {
        this.showStatus("No declaration, definition, or usages found");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`request#${requestId} error ${message}`);
      void vscode.window.showErrorMessage(
        `Custom IntelliJ Navigation: ${message}`,
      );
    } finally {
      this.log(`request#${requestId} end ${Date.now() - startedAt}ms`);
    }
  }

  private async resolveProvider(
    requestId: number,
    snapshot: EditorSnapshot,
    source: ProviderSource,
    command: ProviderCommand,
  ): Promise<ProviderResolution | undefined> {
    const rawResults =
      (await vscode.commands.executeCommand<RawLocation[]>(
        command,
        snapshot.uri,
        snapshot.position,
      )) ?? [];

    if (this.isStale(requestId, snapshot)) {
      return undefined;
    }

    const all = normalizeLocations(rawResults);
    if (all.length === 0) {
      this.log(`request#${requestId} ${source}: no results`);
      return undefined;
    }

    const external = all.filter(
      (location) => !isCurrentLocation(snapshot, location),
    );
    this.log(
      `request#${requestId} ${source}: all=${all.length}, external=${external.length}`,
    );

    return { source, all, external };
  }

  private async navigate(
    snapshot: EditorSnapshot,
    source: ProviderSource,
    targets: readonly vscode.Location[],
  ): Promise<void> {
    this.log(`navigate via ${source}: ${targets.length} target(s)`);

    await vscode.commands.executeCommand(
      "editor.action.goToLocations",
      snapshot.uri,
      snapshot.position,
      targets,
      pickGotoBehavior(targets),
      `No ${source} found`,
    );
  }

  private async peekUsages(
    requestId: number,
    snapshot: EditorSnapshot,
  ): Promise<boolean> {
    const rawReferences =
      (await vscode.commands.executeCommand<vscode.Location[]>(
        "vscode.executeReferenceProvider",
        snapshot.uri,
        snapshot.position,
      )) ?? [];

    if (this.isStale(requestId, snapshot)) {
      return false;
    }

    const references = dedupeLocations(rawReferences).filter(
      (location) => !isCurrentLocation(snapshot, location),
    );

    this.log(`request#${requestId} references: external=${references.length}`);

    if (references.length === 0) {
      return false;
    }

    await vscode.commands.executeCommand(
      "editor.action.peekLocations",
      snapshot.uri,
      snapshot.position,
      references,
      "peek",
    );

    return true;
  }

  private isStale(requestId: number, snapshot: EditorSnapshot): boolean {
    if (requestId !== this.latestRequestId) {
      this.log(`request#${requestId} ignored: superseded by newer request`);
      return true;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.log(`request#${requestId} ignored: no active editor`);
      return true;
    }

    const sameDocument =
      editor.document.uri.toString() === snapshot.uri.toString();
    const sameVersion = editor.document.version === snapshot.version;

    if (!sameDocument || !sameVersion) {
      this.log(`request#${requestId} ignored: editor changed while waiting`);
      return true;
    }

    return false;
  }

  private showStatus(message: string): void {
    this.log(message);
    vscode.window.setStatusBarMessage(message, STATUS_MESSAGE_TIMEOUT_MS);
  }

  private log(message: string): void {
    this.output.appendLine(`[${new Date().toISOString()}] ${message}`);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const navigator = new IntelliJNavigator();

  context.subscriptions.push(
    navigator,
    vscode.commands.registerCommand(COMMAND_ID, () =>
      navigator.goToDeclarationOrUsages(),
    ),
  );
}
