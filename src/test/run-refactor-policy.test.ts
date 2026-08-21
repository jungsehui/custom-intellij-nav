import * as assert from "assert";
import { shouldClaimUnsupported } from "../refactor/run-refactor";

suite("unsupported-claim policy", () => {
  test("claims only for languages the table measured", () => {
    assert.strictEqual(
      shouldClaimUnsupported("extractVariable", "typescript"),
      true,
    );
    assert.strictEqual(shouldClaimUnsupported("extractMethod", "java"), true);
  });

  test("stays quiet for an action whose chain is only the '*' fallback", () => {
    // overrideMethods / implementMethods have no per-language entry at all,
    // and language-action-table.ts records that TS has no counterpart. A
    // toast on every ctrl+O press would assert something we never measured.
    assert.strictEqual(
      shouldClaimUnsupported("overrideMethods", "typescript"),
      false,
    );
    assert.strictEqual(
      shouldClaimUnsupported("implementMethods", "typescript"),
      false,
    );
  });

  test("stays quiet for an unmeasured language", () => {
    assert.strictEqual(shouldClaimUnsupported("extractVariable", "rust"), false);
    assert.strictEqual(shouldClaimUnsupported("inline", "go"), false);
  });

  test("is not fooled by prototype keys", () => {
    assert.strictEqual(
      shouldClaimUnsupported("extractVariable", "constructor"),
      false,
    );
    assert.strictEqual(
      shouldClaimUnsupported("extractVariable", "toString"),
      false,
    );
  });

  test("the '*' key itself is not a claimable language", () => {
    // "*" is an own property of every chain, but it is the fallback marker,
    // not a languageId. No document ever reports "*" as its language.
    assert.strictEqual(shouldClaimUnsupported("extractVariable", "*"), true);
  });
});
