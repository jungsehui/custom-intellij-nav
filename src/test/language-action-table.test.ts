import * as assert from "assert";
import {
  ACTION_LABELS,
  LANGUAGE_ACTION_TABLE,
} from "../refactor/language-action-table";
import type { IntelliJAction } from "../types";

const ACTIONS = Object.keys(LANGUAGE_ACTION_TABLE) as IntelliJAction[];

suite("LANGUAGE_ACTION_TABLE", () => {
  test("every action has a '*' fallback chain", () => {
    // runRefactor falls back to table["*"] for unmeasured languages. A
    // missing entry would make `attempts` undefined and throw on .map().
    for (const action of ACTIONS) {
      assert.ok(
        LANGUAGE_ACTION_TABLE[action]["*"],
        `${action} has no "*" chain`,
      );
    }
  });

  test("no chain is empty", () => {
    for (const action of ACTIONS) {
      for (const [lang, chain] of Object.entries(
        LANGUAGE_ACTION_TABLE[action],
      )) {
        assert.ok(chain.length > 0, `${action}.${lang} chain is empty`);
      }
    }
  });

  test("no chain repeats a kind", () => {
    for (const action of ACTIONS) {
      for (const [lang, chain] of Object.entries(
        LANGUAGE_ACTION_TABLE[action],
      )) {
        const kinds = chain.map((a) => a.kind);
        assert.strictEqual(
          new Set(kinds).size,
          kinds.length,
          `${action}.${lang} repeats a kind: ${kinds.join(", ")}`,
        );
      }
    }
  });

  test("no kind in a chain is a dot-prefix of another in the same chain", () => {
    // Kind matching is prefix-based on dot boundaries, so a chain holding
    // both "refactor.extract" and "refactor.extract.constant" would make the
    // second unreachable and the first dangerously broad.
    for (const action of ACTIONS) {
      for (const [lang, chain] of Object.entries(
        LANGUAGE_ACTION_TABLE[action],
      )) {
        const kinds = chain.map((a) => a.kind);
        for (const a of kinds) {
          for (const b of kinds) {
            if (a === b) {
              continue;
            }
            assert.ok(
              !b.startsWith(`${a}.`),
              `${action}.${lang}: "${a}" is a prefix of "${b}"`,
            );
          }
        }
      }
    }
  });

  test("every kind is a well-formed dotted kind", () => {
    for (const action of ACTIONS) {
      for (const [lang, chain] of Object.entries(
        LANGUAGE_ACTION_TABLE[action],
      )) {
        for (const { kind } of chain) {
          assert.match(
            kind,
            /^[a-z]+(\.[a-zA-Z]+)+$/,
            `${action}.${lang}: malformed kind "${kind}"`,
          );
        }
      }
    }
  });

  test("ACTION_LABELS covers every action with a human-readable name", () => {
    for (const action of ACTIONS) {
      const label = ACTION_LABELS[action];
      assert.ok(label, `${action} has no label`);
      assert.notStrictEqual(
        label,
        action,
        `${action} label is still the internal id`,
      );
    }
  });
});
