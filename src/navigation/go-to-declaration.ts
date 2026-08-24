import * as vscode from "vscode";
import type { Logger } from "../core/logger";
import type { BeginRequest, EditorRequest } from "../core/editor-request";
import { getShowErrorToasts } from "../core/config";
import type {
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

/**
 * IntelliJ-style "Go to Declaration or Usages" handler.
 *
 * Flow:
 *  1. Try declaration provider. If an external declaration exists, navigate.
 *  2. If declaration resolves to the current cursor position, peek usages.
 *  3. If no declaration provider responds, fall back to definition provider.
 *  4. If everything fails, peek usages or surface a status message.
 *
 * Every await boundary is followed by `request.isStale()`, so rapid
 * keypresses don't interleave navigation and a superseded request never
 * writes to the UI.
 */
export async function goToDeclarationOrUsages(
  beginRequest: BeginRequest,
  logger: Logger,
): Promise<void> {
  const request = beginRequest();
  if (!request) {
    return;
  }

  const { snapshot } = request;
  const startedAt = Date.now();

  request.log(
    `start ${snapshot.uri.toString()}@${snapshot.position.line}:${snapshot.position.character}`,
  );

  try {
    const declaration = await resolveProvider(
      request,
      "declaration",
      "vscode.executeDeclarationProvider",
    );

    if (request.isStale()) {
      return;
    }

    if (declaration) {
      if (declaration.external.length > 0) {
        await navigate(request, declaration.source, declaration.external);
        return;
      }

      const outcome = await peekUsages(request);
      if (outcome === "none") {
        logger.showStatus("No usages found");
      }
      return;
    }

    const definition = await resolveProvider(
      request,
      "definition",
      "vscode.executeDefinitionProvider",
    );

    if (request.isStale()) {
      return;
    }

    if (definition) {
      if (definition.external.length > 0) {
        await navigate(request, definition.source, definition.external);
        return;
      }

      const outcome = await peekUsages(request);
      if (outcome === "none") {
        logger.showStatus("No usages found");
      }
      return;
    }

    const outcome = await peekUsages(request);
    if (outcome === "none") {
      logger.showStatus("No declaration, definition, or usages found");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? "") : "";
    request.log(`error ${message}\n${stack}`);

    // A superseded request must not write to the UI. Without this, throwing
    // after being overtaken puts "Navigation failed" on the status bar while
    // the newer request may be navigating successfully.
    if (request.isStale()) {
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
    request.log(`end ${Date.now() - startedAt}ms`);
  }
}

async function resolveProvider(
  request: EditorRequest,
  source: ProviderSource,
  command: ProviderCommand,
): Promise<ProviderResolution | undefined> {
  const { snapshot } = request;

  const rawResults =
    (await vscode.commands.executeCommand<RawLocation[]>(
      command,
      snapshot.uri,
      snapshot.position,
    )) ?? [];

  if (request.isStale()) {
    return undefined;
  }

  const all = normalizeLocations(rawResults);
  if (all.length === 0) {
    request.log(`${source}: no results`);
    return undefined;
  }

  const external = all.filter(
    (location) => !isCurrentLocation(snapshot, location),
  );
  request.log(`${source}: all=${all.length}, external=${external.length}`);

  return { source, external };
}

async function navigate(
  request: EditorRequest,
  source: ProviderSource,
  targets: readonly vscode.Location[],
): Promise<void> {
  const { snapshot } = request;
  request.log(`navigate via ${source}: ${targets.length} target(s)`);

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

async function peekUsages(request: EditorRequest): Promise<PeekOutcome> {
  const { snapshot } = request;

  const rawReferences =
    (await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeReferenceProvider",
      snapshot.uri,
      snapshot.position,
    )) ?? [];

  if (request.isStale()) {
    return "stale";
  }

  const references = dedupeLocations(rawReferences).filter(
    (location) => !isCurrentLocation(snapshot, location),
  );

  request.log(`references: external=${references.length}`);

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
