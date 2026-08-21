import * as vscode from "vscode";
import type { Logger } from "../core/logger";
import { captureSnapshot, isStale } from "../core/snapshot";
import { getShowErrorToasts } from "../core/config";
import type {
  EditorSnapshot,
  ProviderCommand,
  ProviderResolution,
  ProviderSource,
  RawLocation,
} from "../types";
import {
  dedupeLocations,
  isCurrentLocation,
  normalizeLocations,
  pickGotoBehavior,
} from "./location-utils";

interface RequestState {
  /** Caller's monotonic counter; incremented for each new request. */
  bumpRequestId(): number;
  /** Read the latest request id (for staleness checks). */
  getLatestRequestId(): number;
}

/**
 * IntelliJ-style "Go to Declaration or Usages" handler.
 *
 * Flow:
 *  1. Try declaration provider. If an external declaration exists, navigate.
 *  2. If declaration resolves to the current cursor position, peek usages.
 *  3. If no declaration provider responds, fall back to definition provider.
 *  4. If everything fails, peek usages or surface a status message.
 *
 * Stale-request guard ensures rapid keypresses don't interleave navigation.
 */
export async function goToDeclarationOrUsages(
  state: RequestState,
  logger: Logger,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const snapshot = captureSnapshot(editor);
  const requestId = state.bumpRequestId();
  const startedAt = Date.now();

  logger.log(
    `request#${requestId} start ${snapshot.uri.toString()}@${snapshot.position.line}:${snapshot.position.character}`,
  );

  try {
    const declaration = await resolveProvider(
      requestId,
      snapshot,
      "declaration",
      "vscode.executeDeclarationProvider",
      state,
      logger,
    );

    if (isStale(requestId, state.getLatestRequestId(), snapshot, logger)) {
      return;
    }

    if (declaration) {
      if (declaration.external.length > 0) {
        await navigate(snapshot, declaration.source, declaration.external, logger);
        return;
      }

      const outcome = await peekUsages(requestId, snapshot, state, logger);
      if (outcome === "none") {
        logger.showStatus("No usages found");
      }
      return;
    }

    const definition = await resolveProvider(
      requestId,
      snapshot,
      "definition",
      "vscode.executeDefinitionProvider",
      state,
      logger,
    );

    if (isStale(requestId, state.getLatestRequestId(), snapshot, logger)) {
      return;
    }

    if (definition) {
      if (definition.external.length > 0) {
        await navigate(snapshot, definition.source, definition.external, logger);
        return;
      }

      const outcome = await peekUsages(requestId, snapshot, state, logger);
      if (outcome === "none") {
        logger.showStatus("No usages found");
      }
      return;
    }

    const outcome = await peekUsages(requestId, snapshot, state, logger);
    if (outcome === "none") {
      logger.showStatus("No declaration, definition, or usages found");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? "") : "";
    logger.log(`request#${requestId} error ${message}\n${stack}`);

    // A superseded request must not write to the UI. Without this, throwing
    // after being overtaken puts "Navigation failed" on the status bar while
    // the newer request may be navigating successfully.
    if (isStale(requestId, state.getLatestRequestId(), snapshot, logger)) {
      return;
    }

    // Provider transient failures (TS server hiccup, vue.volar inlay hint
    // internals, etc.) are environmental noise, not user intent — don't
    // pop a red toast on every cmd+B. Toggle showErrorToasts for debugging.
    if (getShowErrorToasts()) {
      void vscode.window.showErrorMessage(
        `Custom IntelliJ Navigation: ${message}`,
      );
    } else {
      logger.showStatus("Navigation failed (see Output)");
    }
  } finally {
    logger.log(`request#${requestId} end ${Date.now() - startedAt}ms`);
  }
}

async function resolveProvider(
  requestId: number,
  snapshot: EditorSnapshot,
  source: ProviderSource,
  command: ProviderCommand,
  state: RequestState,
  logger: Logger,
): Promise<ProviderResolution | undefined> {
  const rawResults =
    (await vscode.commands.executeCommand<RawLocation[]>(
      command,
      snapshot.uri,
      snapshot.position,
    )) ?? [];

  if (isStale(requestId, state.getLatestRequestId(), snapshot, logger)) {
    return undefined;
  }

  const all = normalizeLocations(rawResults);
  if (all.length === 0) {
    logger.log(`request#${requestId} ${source}: no results`);
    return undefined;
  }

  const external = all.filter(
    (location) => !isCurrentLocation(snapshot, location),
  );
  logger.log(
    `request#${requestId} ${source}: all=${all.length}, external=${external.length}`,
  );

  return { source, external };
}

async function navigate(
  snapshot: EditorSnapshot,
  source: ProviderSource,
  targets: readonly vscode.Location[],
  logger: Logger,
): Promise<void> {
  logger.log(`navigate via ${source}: ${targets.length} target(s)`);

  await vscode.commands.executeCommand(
    "editor.action.goToLocations",
    snapshot.uri,
    snapshot.position,
    targets,
    pickGotoBehavior(targets),
    `No ${source} found`,
  );
}

/**
 * Outcome of a usages lookup.
 *
 * "stale" is deliberately distinct from "none". Both used to return `false`,
 * so a superseded request wrote "No usages found" to the status bar — while
 * the request that superseded it may have been navigating successfully.
 */
type PeekOutcome = "shown" | "none" | "stale";

async function peekUsages(
  requestId: number,
  snapshot: EditorSnapshot,
  state: RequestState,
  logger: Logger,
): Promise<PeekOutcome> {
  const rawReferences =
    (await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeReferenceProvider",
      snapshot.uri,
      snapshot.position,
    )) ?? [];

  if (isStale(requestId, state.getLatestRequestId(), snapshot, logger)) {
    return "stale";
  }

  const references = dedupeLocations(rawReferences).filter(
    (location) => !isCurrentLocation(snapshot, location),
  );

  logger.log(`request#${requestId} references: external=${references.length}`);

  if (references.length === 0) {
    return "none";
  }

  await vscode.commands.executeCommand(
    "editor.action.peekLocations",
    snapshot.uri,
    snapshot.position,
    references,
    "peek",
  );

  return "shown";
}
