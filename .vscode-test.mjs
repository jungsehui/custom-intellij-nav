import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	// A folder has to be open for ConfigurationTarget.Workspace to be
	// writable. migrateLegacySettings has a workspace branch, and without
	// this it is unreachable from a test.
	workspaceFolder: './test-fixtures/workspace',
	// Mocha defaults to 2s. Tests that drive the TypeScript language server
	// and then wait for the edit to land need more than that -- at 2s they
	// die mid-wait and look like "the refactoring never applied".
	mocha: { timeout: 20000 },
});
