import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [{
    files: ["**/*.ts"],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],

        // Not on by default in this config, which is how a dead
        // `import { migrateLegacySettings }` sat in extension.ts unnoticed:
        // the call went through the navigator forwarder instead. Errors
        // rather than warns, so `npm run lint` fails on it.
        "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
        }],

        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "warn",
    },
}, {
    // The inner ring: decisions and data, no VS Code.
    //
    // These three already compile to JavaScript with zero require("vscode")
    // -- types.ts only uses the namespace in type position, so TypeScript
    // erases it. That is a property nobody enforced, which means one runtime
    // call would silently move a file out of the ring. Now it fails the build.
    //
    // location-utils.ts is deliberately NOT here: it calls
    // `new vscode.Location(...)`, and that construction is the whole point of
    // the module. Pushing it out would scatter value-building into callers.
    files: [
        "src/types.ts",
        "src/refactor/language-action-table.ts",
        "src/refactor/policy.ts",
    ],

    rules: {
        // The base rule cannot tell `import type` from a runtime import;
        // the typescript-eslint one can. types.ts legitimately needs
        // vscode.Uri and friends as *types* — what it must not do is call
        // into VS Code at runtime.
        "no-restricted-imports": "off",
        "@typescript-eslint/no-restricted-imports": ["error", {
            paths: [{
                name: "vscode",
                allowTypeImports: true,
                message:
                    "This file is the inner ring: rules and data, no VS Code. " +
                    "If it genuinely needs the editor, it belongs in an adapter " +
                    "(run-refactor.ts, go-to-declaration.ts) instead.",
            }],
        }],
    },
}];
