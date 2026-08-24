# Test fixture workspace

Opened by `.vscode-test.mjs` so tests can exercise
`ConfigurationTarget.Workspace`. Without a folder open, VS Code rejects a
workspace-scoped `config.update`, and `migrateLegacySettings` has a
workspace branch that would otherwise be unreachable.

Settings written here during a test run land in `.vscode/settings.json`
inside this folder, which is gitignored.
