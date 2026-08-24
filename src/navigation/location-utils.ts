import * as vscode from "vscode";
import type { EditorSnapshot } from "../types";

/**
 * What a definition/declaration provider can hand back.
 *
 * Lives here because `toLocation` below is what turns either shape into a
 * plain Location, and `go-to-declaration.ts` already imports this module.
 */
export type RawLocation = vscode.Location | vscode.LocationLink;

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

export function dedupeLocations(
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

export function normalizeLocations(
  items: readonly RawLocation[],
): vscode.Location[] {
  return dedupeLocations(items.map(toLocation));
}

export function isCurrentLocation(
  snapshot: EditorSnapshot,
  location: vscode.Location,
): boolean {
  return (
    location.uri.toString() === snapshot.uri.toString() &&
    location.range.contains(snapshot.position)
  );
}

export function pickGotoBehavior(
  locations: readonly vscode.Location[],
): "goto" | "gotoAndPeek" {
  return locations.length > 1 ? "gotoAndPeek" : "goto";
}
