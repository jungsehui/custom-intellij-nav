#!/usr/bin/env node
// Ask VS Code for its own macOS default keybindings, then audit ours against them.
//
// Why VS Code itself, not its source: a source parser misses registrations split
// across lines and cannot tell a keybinding from a key handler. The method, its
// controls and the audit rules are in .claude/conventions.md, "Audit the exposed
// bindings against VS Code's own default keybindings".
//
// Usage (macOS only; the defaults it reads are platform-resolved):
//   npm run audit:keybindings                          # current stable
//   npm run audit:keybindings -- 1.141.0               # a given version
//   npm run audit:keybindings -- --baseline 1.140.0    # also diff against a baseline
//
// Exit codes: 0 clean, 1 a control failed or an unexpected pure duplicate exists,
// 2 wrong platform or bad arguments.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Short on purpose: VS Code puts a Unix socket in --user-data-dir, and macOS
// caps socket paths at 104 bytes. A long scratch path dies with `listen EINVAL`.
const WORK_DIR = path.join(REPO, ".vscode-test", "kbdump");
const SOCKET_PATH_LIMIT = 104;

// Pure duplicates we keep on purpose. Anything else re-binding a chord to its
// own default is a finding.
const KEPT_DUPLICATES = new Map([
  ["shift+cmd+[", "explicit re-registration, gated !terminalFocus (roadmap.md)"],
  ["shift+cmd+]", "explicit re-registration, gated !terminalFocus (roadmap.md)"],
  ["cmd+x", "focus-gated (editorTextFocus), so it displaces nothing"],
]);

// IntelliJ behaviour we leave entirely to VS Code. If VS Code moves one of these,
// parity breaks and nothing of ours collides, so only a baseline diff shows it.
const RELIED_UPON = ["cmd+,", "cmd+up", "cmd+down"];

const MODIFIER_ORDER = ["ctrl", "shift", "alt", "cmd"];

function normalizeChord(chord) {
  return chord
    .trim()
    .split(/\s+/)
    .map((part) => {
      const tokens = part.toLowerCase().split("+");
      const key = tokens.pop();
      tokens.sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b));
      return [...tokens, key].join("+");
    })
    .join(" ");
}

/** JSONC to JSON: drop comments outside strings, then trailing commas. */
function stripJsonc(text) {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") out += text[++i];
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (text.startsWith("//", i)) {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 1;
    } else {
      out += c;
    }
  }
  return out.replace(/,(\s*[\]}])/g, "$1");
}

/** A `when` that names nothing but isMac and config.* terms is exposed. */
function isExposed(when) {
  return (when ?? "").replace(/config\.[\w.]+|\bisMac\b|[\s()&|!]/g, "") === "";
}

const sameArgs = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const PROBE_SUITE = `
const vscode = require("vscode");
const fs = require("fs");
exports.run = async function () {
  // Let the extension host read every built-in manifest first.
  await new Promise((resolve) => setTimeout(resolve, 6000));
  const doc = await vscode.workspace.openTextDocument(
    vscode.Uri.parse("vscode://defaultsettings/keybindings.json"));
  fs.writeFileSync(process.env.DUMP_OUT, doc.getText());
  fs.writeFileSync(process.env.DUMP_OUT + ".version", vscode.version);
};
`;

async function dumpDefaults(version) {
  const userDataDir = path.join(WORK_DIR, "ud");
  const socketPath = path.join(userDataDir, "1.140-main.sock");
  if (Buffer.byteLength(socketPath) >= SOCKET_PATH_LIMIT) {
    throw new Error(`socket path would be ${Buffer.byteLength(socketPath)} bytes; macOS allows ${SOCKET_PATH_LIMIT}. Move the repo to a shorter path.`);
  }

  const probeDir = path.join(WORK_DIR, "probe");
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(probeDir, { recursive: true });
  fs.mkdirSync(path.join(WORK_DIR, "exts"), { recursive: true });
  fs.writeFileSync(path.join(probeDir, "package.json"), JSON.stringify({
    name: "kb-dump-probe", publisher: "probe", version: "0.0.1", engines: { vscode: "^1.106.0" },
  }));
  const suite = path.join(probeDir, "suite.cjs");
  fs.writeFileSync(suite, PROBE_SUITE);

  const dumpOut = path.join(WORK_DIR, "dump.jsonc");
  fs.rmSync(dumpOut, { force: true });
  const vscodeExecutablePath = await downloadAndUnzipVSCode({
    version, cachePath: path.join(REPO, ".vscode-test"),
  });
  await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath: probeDir,
    extensionTestsPath: suite,
    extensionTestsEnv: { DUMP_OUT: dumpOut },
    launchArgs: [
      "--user-data-dir", userDataDir,
      "--extensions-dir", path.join(WORK_DIR, "exts"),
      "--disable-workspace-trust",
    ],
  });

  const resolved = fs.readFileSync(dumpOut + ".version", "utf8").trim();
  const defaults = JSON.parse(stripJsonc(fs.readFileSync(dumpOut, "utf8")));
  fs.writeFileSync(path.join(WORK_DIR, `defaults-${resolved}.json`), JSON.stringify(defaults, null, 1));
  return { resolved, defaults };
}

function loadOrDump(version) {
  const cached = path.join(WORK_DIR, `defaults-${version}.json`);
  if (fs.existsSync(cached)) {
    return Promise.resolve({ resolved: version, defaults: JSON.parse(fs.readFileSync(cached, "utf8")) });
  }
  return dumpDefaults(version);
}

/** The instrument proves itself before anything is concluded from it. */
function checkControls(defaults) {
  const has = (key, command) => defaults.some((d) => normalizeChord(d.key) === key && d.command === command);
  const controls = [
    ["cmd+w -> workbench.action.closeActiveEditor (core)", has("cmd+w", "workbench.action.closeActiveEditor")],
    ["cmd+k v -> markdown.showPreviewToSide (built-in extension)", has("cmd+k v", "markdown.showPreviewToSide")],
    ["no entry mentions customIntellijNav", !JSON.stringify(defaults).includes("customIntellijNav")],
  ];
  for (const [name, ok] of controls) console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`);
  return controls.every(([, ok]) => ok);
}

function audit(defaults) {
  const byChord = new Map();
  for (const d of defaults) {
    const key = normalizeChord(d.key);
    byChord.set(key, [...(byChord.get(key) ?? []), d]);
  }

  const ours = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8")).contributes.keybindings;
  const pure = [];
  const conditional = [];
  const displacements = [];
  let exposed = 0;

  for (const binding of ours) {
    const chord = normalizeChord(binding.mac ?? binding.key);
    const onChord = byChord.get(chord) ?? [];
    for (const d of onChord.filter((d) => d.command === binding.command && sameArgs(d.args, binding.args))) {
      (d.when === undefined ? pure : conditional).push({ chord, command: binding.command, defaultWhen: d.when });
    }
    if (isExposed(binding.when)) {
      exposed++;
      const others = onChord.filter((d) => d.command !== binding.command);
      if (others.length > 0) displacements.push({ chord, command: binding.command, others });
    }
  }
  return { total: ours.length, exposed, pure, conditional, displacements };
}

function diffAgainstBaseline(baseline, current) {
  const ourChords = new Set(
    JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"))
      .contributes.keybindings.map((b) => normalizeChord(b.mac ?? b.key)),
  );
  const watched = (d) => ourChords.has(normalizeChord(d.key)) || RELIED_UPON.includes(normalizeChord(d.key));
  const id = (d) => `${normalizeChord(d.key)} | ${d.command} | ${d.when ?? ""}`;
  const before = new Set(baseline.filter(watched).map(id));
  const after = new Set(current.filter(watched).map(id));
  return {
    added: [...after].filter((x) => !before.has(x)),
    removed: [...before].filter((x) => !after.has(x)),
  };
}

async function main() {
  if (process.platform !== "darwin") {
    console.error("macOS only: the defaults VS Code reports are resolved for the platform it runs on, and this keymap is Mac-only.");
    process.exit(2);
  }
  const args = process.argv.slice(2);
  const baselineAt = args.indexOf("--baseline");
  const baselineVersion = baselineAt >= 0 ? args[baselineAt + 1] : undefined;
  if (baselineAt >= 0 && !baselineVersion) {
    console.error("--baseline needs a version, e.g. --baseline 1.140.0");
    process.exit(2);
  }
  const baselineValueAt = baselineAt >= 0 ? baselineAt + 1 : -1;
  const version = args.find((a, i) => !a.startsWith("--") && i !== baselineValueAt) ?? "stable";

  const { resolved, defaults } = await dumpDefaults(version);
  console.log(`VS Code ${resolved}: ${defaults.length} default keybindings (macOS)`);
  console.log("Controls:");
  if (!checkControls(defaults)) {
    console.error("A control failed, so nothing below could be trusted. Stopping.");
    process.exit(1);
  }

  const result = audit(defaults);
  console.log(`\nOur bindings: ${result.total}, exposed (no focus condition): ${result.exposed}`);

  console.log(`\nPure duplicates (same chord, command and args; the default has no when): ${result.pure.length}`);
  const unexpected = [];
  for (const p of result.pure) {
    const reason = KEPT_DUPLICATES.get(p.chord);
    console.log(`  ${p.chord.padEnd(18)} ${p.command}  ${reason ? `[kept: ${reason}]` : "[NEW FINDING]"}`);
    if (!reason) unexpected.push(p);
  }

  console.log(`\nConditional duplicates (the default's when is narrower; removing ours loses behaviour): ${result.conditional.length}`);
  for (const c of result.conditional) console.log(`  ${c.chord.padEnd(18)} ${c.command}  default when: ${c.defaultWhen}`);

  console.log("\nDefaults displaced by exposed bindings (README \"Displaced defaults\" should list each):");
  for (const d of result.displacements) {
    console.log(`  ${d.chord.padEnd(18)} ${d.command}`);
    for (const o of d.others) console.log(`      ${o.command}  [${o.when ?? "no when"}]`);
  }

  if (baselineVersion) {
    const { resolved: baseResolved, defaults: base } = await loadOrDump(baselineVersion);
    const { added, removed } = diffAgainstBaseline(base, defaults);
    console.log(`\nDifferences from ${baseResolved} on our chords and the relied-upon ones (${RELIED_UPON.join(", ")}):`);
    console.log(`  (+ only in ${resolved}, - only in ${baseResolved}; a changed when shows as one of each)`);
    for (const a of added) console.log(`  + ${a}`);
    for (const r of removed) console.log(`  - ${r}`);
    if (added.length + removed.length === 0) console.log("  none");
  }

  if (unexpected.length > 0) {
    console.error(`\n${unexpected.length} new pure duplicate(s). Remove them, or add a recorded reason to KEPT_DUPLICATES.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
