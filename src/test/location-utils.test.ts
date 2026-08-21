import * as assert from "assert";
import * as vscode from "vscode";
import {
  dedupeLocations,
  isCurrentLocation,
  normalizeLocations,
  pickGotoBehavior,
} from "../navigation/location-utils";
import type { EditorSnapshot } from "../types";

const uri = (p: string) => vscode.Uri.file(p);
const at = (line: number, ch: number) => new vscode.Position(line, ch);
const loc = (p: string, l1: number, c1: number, l2 = l1, c2 = c1 + 1) =>
  new vscode.Location(uri(p), new vscode.Range(at(l1, c1), at(l2, c2)));

const snapshot = (p: string, line: number, ch: number): EditorSnapshot => ({
  uri: uri(p),
  version: 1,
  position: at(line, ch),
  selection: new vscode.Selection(at(line, ch), at(line, ch)),
});

suite("location-utils", () => {
  test("dedupeLocations collapses identical uri+range, keeping order", () => {
    const result = dedupeLocations([
      loc("/a.ts", 1, 0),
      loc("/b.ts", 5, 2),
      loc("/a.ts", 1, 0),
    ]);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].uri.fsPath, uri("/a.ts").fsPath);
    assert.strictEqual(result[1].uri.fsPath, uri("/b.ts").fsPath);
  });

  test("dedupeLocations keeps same-file locations at different ranges", () => {
    const result = dedupeLocations([loc("/a.ts", 1, 0), loc("/a.ts", 9, 0)]);
    assert.strictEqual(result.length, 2);
  });

  test("normalizeLocations converts LocationLink and prefers the selection range", () => {
    const link: vscode.LocationLink = {
      targetUri: uri("/a.ts"),
      targetRange: new vscode.Range(at(0, 0), at(9, 0)),
      targetSelectionRange: new vscode.Range(at(3, 4), at(3, 9)),
    };
    const [only] = normalizeLocations([link]);
    assert.strictEqual(only.range.start.line, 3);
    assert.strictEqual(only.range.start.character, 4);
  });

  test("normalizeLocations falls back to targetRange when no selection range", () => {
    const link: vscode.LocationLink = {
      targetUri: uri("/a.ts"),
      targetRange: new vscode.Range(at(2, 1), at(2, 6)),
    };
    const [only] = normalizeLocations([link]);
    assert.strictEqual(only.range.start.line, 2);
  });

  test("isCurrentLocation is true only for the same file containing the caret", () => {
    const snap = snapshot("/a.ts", 3, 5);
    assert.ok(isCurrentLocation(snap, loc("/a.ts", 3, 0, 3, 10)));
    assert.ok(!isCurrentLocation(snap, loc("/a.ts", 7, 0, 7, 10)));
    assert.ok(!isCurrentLocation(snap, loc("/b.ts", 3, 0, 3, 10)));
  });

  test("pickGotoBehavior peeks only when there is more than one target", () => {
    assert.strictEqual(pickGotoBehavior([loc("/a.ts", 1, 0)]), "goto");
    assert.strictEqual(
      pickGotoBehavior([loc("/a.ts", 1, 0), loc("/b.ts", 1, 0)]),
      "gotoAndPeek",
    );
    assert.strictEqual(pickGotoBehavior([]), "goto");
  });
});
