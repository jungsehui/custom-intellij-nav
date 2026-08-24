import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	// A folder has to be open for ConfigurationTarget.Workspace to be
	// writable. migrateLegacySettings has a workspace branch, and without
	// this it is unreachable from a test.
	workspaceFolder: './test-fixtures/workspace',
});
