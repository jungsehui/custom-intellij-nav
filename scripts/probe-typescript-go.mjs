#!/usr/bin/env node
// Measure what this keymap's refactorings get under TypeScript Go, with VS
// Code's built-in TypeScript as the control.
//
// Why: with `js/ts.experimental.useTsgo` on and a TypeScript Go extension
// installed, VS Code turns its own TS/JS features off and TypeScript Go serves
// the language. On 2026-10-22 TypeScript Go 1.0.1 offered quick fixes but no
// refactorings at all, so this keymap's Extract, Inline and Move keys had
// nothing to run. src/refactor/policy.ts states which refactorings it lacks,
// and src/core/config.ts decides when it is serving; this script checks both
// against a real VS Code. Method and history: .claude/conventions.md,
// "TypeScript Go offers no refactorings".
//
// Usage (run `npm run compile` first; the probe loads out/):
//   npm run probe:tsgo                 # current stable VS Code
//   npm run probe:tsgo -- 1.143.0      # a given version
//
// Exit codes: 0 controls pass and the claims match the measurement,
// 1 a control failed or a claim is stale, 2 bad setup.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from "@vscode/test-electron";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Short on purpose: VS Code puts a Unix socket in --user-data-dir, and macOS
// caps socket paths at 104 bytes.
const WORK_DIR = path.join(REPO, ".vscode-test", "tsgo");
const SOCKET_PATH_LIMIT = 104;
const TYPESCRIPT_GO_EXTENSION = "TypeScriptTeam.native-preview";
const require = createRequire(import.meta.url);

// One base name per language, so each `use-*` file imports its own sample.
const LANGUAGES = [
  { id: "typescript", ext: "ts", typed: true },
  { id: "typescriptreact", ext: "tsx", typed: true },
  { id: "javascript", ext: "js", typed: false },
  { id: "javascriptreact", ext: "jsx", typed: false },
].map((l) => ({
  ...l,
  file: `sample-${l.ext}.${l.ext}`,
  broken: `broken-${l.ext}.${l.ext}`,
  use: `use-${l.ext}.${l.ext}`,
  module: `./sample-${l.ext}`,
}));
// What ⌘B asks for, in the order src/navigation/go-to-declaration.ts asks.
const NAVIGATION = ["declaration", "definition", "references"];
const ACTIONS = [
  "extractVariable", "extractMethod", "extractConstant", "inline", "move",
  "overrideMethods", "implementMethods",
];

function sampleSource(typed) {
  const t = (annotation) => (typed ? annotation : "");
  return [
    `export function compute()${t(": number")} {`,
    "  const a = 1 + 2;",
    "  const total = a * 3;",
    "  console.log(total);",
    "  return total;",
    "}",
    "",
    "export class Base {",
    `  greet()${t(": string")} {`,
    '    return "hi";',
    "  }",
    "}",
    "",
    "export class Child extends Base {}",
    "",
  ].join("\n");
}

function writeWorkspace() {
  const ws = path.join(WORK_DIR, "ws");
  fs.rmSync(ws, { recursive: true, force: true });
  fs.mkdirSync(ws, { recursive: true });
  fs.writeFileSync(path.join(ws, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true,
      allowJs: true, checkJs: true, jsx: "preserve", lib: ["ES2022", "DOM"],
    },
    include: ["*.ts", "*.tsx", "*.js", "*.jsx"],
  }, null, 1));
  for (const lang of LANGUAGES) {
    fs.writeFileSync(path.join(ws, lang.file), sampleSource(lang.typed));
    // Controls. A syntax error, which any server analysing the file reports
    // whatever checkJs says; and a missing name whose quick fix (add the
    // import) shows the code-action pipeline answering. JS files do not
    // report the missing name here, which is why both are needed.
    fs.writeFileSync(path.join(ws, lang.broken), "export const r = compute();\nconst broken = ;\n");
    // ⌘B's subject: a call to the sample's function from another file.
    fs.writeFileSync(path.join(ws, lang.use), `import { compute } from "${lang.module}";\nexport const r = compute();\n`);
  }
  return ws;
}

const PROBE_SUITE = `
const vscode = require("vscode");
const fs = require("fs");
const OUT = process.env.PROBE_OUT;
const REPO = process.env.PROBE_REPO;
const LANGUAGES = ${JSON.stringify(LANGUAGES)};
const ACTIONS = ${JSON.stringify(ACTIONS)};
const NAVIGATION = ${JSON.stringify(NAVIGATION)};
const log = (o) => fs.appendFileSync(OUT, JSON.stringify(o) + "\\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nonEmpty = (x) => (x && x.length ? x : undefined);
async function poll(fn, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fn(); if (r) return r; } catch { /* not ready yet */ }
    await sleep(1000);
  }
  return undefined;
}
const actions = (uri, range, kind) =>
  vscode.commands.executeCommand("vscode.executeCodeActionProvider", uri, range, kind);
function select(doc, needle, offset = 0, length) {
  const i = doc.getText().indexOf(needle);
  if (i < 0) throw new Error("needle not found: " + needle);
  const start = doc.positionAt(i + offset);
  return new vscode.Selection(start, doc.positionAt(i + offset + (length ?? needle.length)));
}
const SELECTIONS = {
  extractVariable: (d) => select(d, "1 + 2"),
  extractConstant: (d) => select(d, "1 + 2"),
  extractMethod: (d) => new vscode.Selection(select(d, "const total").start, select(d, "console.log(total);").end),
  inline: (d) => select(d, "const a =", 6, 1),
  move: (d) => select(d, "compute", 0, 7),
  overrideMethods: (d) => select(d, "class Child", 6, 5),
  implementMethods: (d) => select(d, "class Child", 6, 5),
};
exports.run = async function () {
  const { resolveAttempts } = require(REPO + "/out/refactor/policy.js");
  let detector;
  try { detector = require(REPO + "/out/core/config.js").isTypeScriptGoServing; } catch { /* older build */ }
  const tsgo = vscode.extensions.getExtension("${TYPESCRIPT_GO_EXTENSION}");
  log({ type: "env", mode: process.env.PROBE_MODE, vscode: vscode.version,
        typescriptGo: tsgo ? tsgo.packageJSON.version : null,
        detector: typeof detector === "function" ? detector() : "absent" });
  const root = vscode.workspace.workspaceFolders[0].uri;
  for (const lang of LANGUAGES) {
    const brokenUri = vscode.Uri.joinPath(root, lang.broken);
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(brokenUri), { preview: false });
    const diagnostics = (await poll(() => nonEmpty(vscode.languages.getDiagnostics(brokenUri)), 90000)) || [];
    const missingName = diagnostics.find((d) => d.message.includes("compute"));
    const fixes = missingName
      ? (await poll(async () => nonEmpty(await actions(brokenUri, missingName.range, "quickfix")), 30000)) || []
      : [];
    const uri = vscode.Uri.joinPath(root, lang.file);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
    const symbols = (await poll(async () => nonEmpty(await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", uri)), 90000)) || [];
    const counts = {};
    for (const action of ACTIONS) {
      const range = SELECTIONS[action](doc);
      let found = [];
      for (const attempt of resolveAttempts(action, doc.languageId)) {
        found = found.concat((await poll(async () => nonEmpty(await actions(uri, range, attempt.kind)), 5000)) || []);
      }
      counts[action] = found.length;
    }
    // ⌘B: declaration, then definition, at a call site; usages at the
    // definition itself. The same three commands go-to-declaration.ts runs.
    const useUri = vscode.Uri.joinPath(root, lang.use);
    const useDoc = await vscode.workspace.openTextDocument(useUri);
    await vscode.window.showTextDocument(useDoc, { preview: false });
    const callSite = useDoc.positionAt(useDoc.getText().lastIndexOf("compute(") + 2);
    const definitionSite = doc.positionAt(doc.getText().indexOf("compute") + 2);
    const ask = async (command, target, position) =>
      ((await poll(async () => nonEmpty(await vscode.commands.executeCommand(command, target, position)), 10000)) || []).length;
    const navigation = {
      declaration: await ask("vscode.executeDeclarationProvider", useUri, callSite),
      definition: await ask("vscode.executeDefinitionProvider", useUri, callSite),
      references: await ask("vscode.executeReferenceProvider", uri, definitionSite),
    };
    log({ type: "language", lang: lang.id, languageId: doc.languageId, symbols: symbols.length,
          diagnostics: diagnostics.length, quickfixes: fixes.length, counts, navigation });
  }
};
`;

function readJsonl(file) {
  return fs.readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

async function runMode(vscodeExecutablePath, mode) {
  const userDataDir = path.join(WORK_DIR, "ud");
  fs.mkdirSync(path.join(userDataDir, "User"), { recursive: true });
  const on = mode === "tsgo";
  fs.writeFileSync(path.join(userDataDir, "User", "settings.json"),
    JSON.stringify({ "js/ts.experimental.useTsgo": on }, null, 1));
  const probeDir = path.join(WORK_DIR, "probe");
  fs.mkdirSync(probeDir, { recursive: true });
  fs.writeFileSync(path.join(probeDir, "package.json"), JSON.stringify({
    name: "tsgo-probe", publisher: "probe", version: "0.0.1", engines: { vscode: "^1.106.0" },
  }));
  fs.writeFileSync(path.join(probeDir, "suite.cjs"), PROBE_SUITE);
  const out = path.join(WORK_DIR, `result-${mode}.jsonl`);
  fs.rmSync(out, { force: true });
  await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath: probeDir,
    extensionTestsPath: path.join(probeDir, "suite.cjs"),
    extensionTestsEnv: { PROBE_OUT: out, PROBE_MODE: mode, PROBE_REPO: REPO },
    launchArgs: [path.join(WORK_DIR, "ws"), "--user-data-dir", userDataDir,
      "--extensions-dir", path.join(WORK_DIR, "exts"), "--disable-workspace-trust"],
  });
  return readJsonl(out);
}

async function main() {
  if (!fs.existsSync(path.join(REPO, "out", "refactor", "policy.js"))) {
    console.error("No compiled out/. Run `npm run compile` first.");
    process.exit(2);
  }
  const socketPath = path.join(WORK_DIR, "ud", "1.143-main.sock");
  if (Buffer.byteLength(socketPath) >= SOCKET_PATH_LIMIT) {
    console.error(`socket path would be ${Buffer.byteLength(socketPath)} bytes; macOS allows ${SOCKET_PATH_LIMIT}.`);
    process.exit(2);
  }
  const version = process.argv[2] ?? "stable";
  const vscodeExecutablePath = await downloadAndUnzipVSCode({ version, cachePath: path.join(REPO, ".vscode-test") });

  // Install (or update) TypeScript Go into an isolated profile. The user's own
  // VS Code profile and extensions are never touched.
  const [cli] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
  fs.mkdirSync(path.join(WORK_DIR, "exts"), { recursive: true });
  const install = spawnSync(cli, [
    "--user-data-dir", path.join(WORK_DIR, "ud"), "--extensions-dir", path.join(WORK_DIR, "exts"),
    "--install-extension", TYPESCRIPT_GO_EXTENSION, "--force",
  ], { encoding: "utf8" });
  if (install.status !== 0) {
    console.error("Installing TypeScript Go failed:\n" + install.stdout + install.stderr);
    process.exit(1);
  }
  writeWorkspace();

  const results = {};
  for (const mode of ["builtin", "tsgo"]) results[mode] = await runMode(vscodeExecutablePath, mode);

  const env = (mode) => results[mode].find((r) => r.type === "env");
  const langs = (mode) => Object.fromEntries(results[mode].filter((r) => r.type === "language").map((r) => [r.lang, r]));
  const builtin = langs("builtin");
  const tsgo = langs("tsgo");
  console.log(`VS Code ${env("tsgo").vscode}, TypeScript Go ${env("tsgo").typescriptGo}`);

  // The instrument proves itself before anything is concluded from it.
  const controls = [
    ["TypeScript Go is installed in the probe profile", Boolean(env("tsgo").typescriptGo)],
    ["the built-in TypeScript offers Extract Variable on typescript (the selections are valid)",
      (builtin.typescript?.counts.extractVariable ?? 0) > 0],
  ];
  for (const mode of ["builtin", "tsgo"]) {
    for (const lang of LANGUAGES) {
      const r = langs(mode)[lang.id];
      controls.push([`${mode}: ${lang.id} is analysed (document symbols and a syntax diagnostic)`,
        Boolean(r && r.languageId === lang.id && r.symbols > 0 && r.diagnostics > 0)]);
    }
    controls.push([`${mode}: the code-action pipeline answers (a quick fix on typescript)`,
      (langs(mode).typescript?.quickfixes ?? 0) > 0]);
  }
  for (const lang of LANGUAGES) {
    const n = builtin[lang.id]?.navigation;
    controls.push([`builtin: ${lang.id} resolves the definition and usages (the positions are valid)`,
      Boolean(n && n.definition > 0 && n.references > 0)]);
  }
  const detectorPresent = env("tsgo").detector !== "absent";
  if (detectorPresent) {
    controls.push(["config.isTypeScriptGoServing() is false with the built-in TypeScript", env("builtin").detector === false]);
    controls.push(["config.isTypeScriptGoServing() is true under TypeScript Go", env("tsgo").detector === true]);
  }
  console.log("Controls:");
  for (const [name, ok] of controls) console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
  if (!controls.every(([, ok]) => ok)) {
    console.error("A control failed, so nothing below could be trusted. Stopping.");
    process.exit(1);
  }

  console.log("\nCode actions per refactoring (built-in TypeScript / TypeScript Go):");
  console.log("  " + "".padEnd(17) + LANGUAGES.map((l) => l.id.padEnd(17)).join(""));
  for (const action of ACTIONS) {
    const cells = LANGUAGES.map((l) => `${builtin[l.id].counts[action]} / ${tsgo[l.id].counts[action]}`.padEnd(17));
    console.log("  " + action.padEnd(17) + cells.join(""));
  }

  console.log("\n⌘B's providers (built-in TypeScript / TypeScript Go):");
  console.log("  " + "".padEnd(17) + LANGUAGES.map((l) => l.id.padEnd(17)).join(""));
  for (const step of NAVIGATION) {
    const cells = LANGUAGES.map((l) => `${builtin[l.id].navigation[step]} / ${tsgo[l.id].navigation[step]}`.padEnd(17));
    console.log("  " + step.padEnd(17) + cells.join(""));
  }
  // README says ⌘B works under TypeScript Go. Declaration is 0 under both
  // (VS Code's TypeScript has no separate declaration provider; ⌘B falls
  // through to definition), so the claim rests on definition and usages.
  const navigationGaps = [];
  for (const lang of LANGUAGES) {
    for (const step of ["definition", "references"]) {
      if (builtin[lang.id].navigation[step] > 0 && tsgo[lang.id].navigation[step] === 0) {
        navigationGaps.push(`${lang.id} ${step}`);
      }
    }
  }
  console.log(`  missing under TypeScript Go where the built-in TypeScript answers: ${navigationGaps.join(", ") || "none"}`);
  if (navigationGaps.length > 0) {
    console.error("\n⌘B no longer works the same under TypeScript Go. Update README Limitations, then re-run.");
    process.exitCode = 1;
  }

  // policy.isMissingInTypeScriptGo(action, langId) must equal the measurement:
  // the built-in TypeScript offers it and TypeScript Go does not.
  const policy = require(path.join(REPO, "out", "refactor", "policy.js"));
  if (typeof policy.isMissingInTypeScriptGo !== "function") {
    console.log("\npolicy.isMissingInTypeScriptGo is not in this build; nothing to check it against.");
    return;
  }
  const stale = [];
  const unclaimed = [];
  for (const lang of LANGUAGES) {
    for (const action of ACTIONS) {
      const measured = builtin[lang.id].counts[action] > 0 && tsgo[lang.id].counts[action] === 0;
      const claimed = policy.isMissingInTypeScriptGo(action, lang.id);
      if (claimed && !measured) stale.push(`${lang.id} ${action}`);
      if (!claimed && measured) unclaimed.push(`${lang.id} ${action}`);
    }
  }
  console.log("\npolicy.isMissingInTypeScriptGo against the measurement:");
  console.log(`  stale claims (TypeScript Go has it now): ${stale.join(", ") || "none"}`);
  console.log(`  unclaimed gaps (measured, not claimed):  ${unclaimed.join(", ") || "none"}`);
  if (stale.length + unclaimed.length > 0) {
    console.error("\nUpdate the TypeScript Go table in src/refactor/policy.ts to match, then re-run.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
