---
description: Compile, package as VSIX, uninstall old version, install fresh, prompt to reload window. The dev iteration loop.
---

Run the full ship-to-local-VS-Code sequence in one shot. Do these steps
exactly:

1. Verify Node 22 is on PATH:

   ```bash
   export PATH="$HOME/.nvm/versions/node/v22.22.1/bin:$PATH"
   node --version  # must be v22.x
   ```

2. Typecheck and compile:

   ```bash
   npm run check && npm run compile
   ```

   If either fails, fix before proceeding. Do not skip.

3. Package the VSIX:

   ```bash
   rm -f custom-intellij-nav-*.vsix
   npx vsce package --allow-missing-repository
   ```

4. Capture the version from `package.json`:

   ```bash
   VERSION=$(node -p "require('./package.json').version")
   ```

5. Uninstall any prior install and clear stale extension dirs:

   ```bash
   code --uninstall-extension jungsehui.custom-intellij-nav
   rm -rf $HOME/.vscode/extensions/jungsehui.custom-intellij-nav-*
   ```

6. Install the freshly built VSIX:

   ```bash
   code --install-extension custom-intellij-nav-${VERSION}.vsix
   ```

7. Verify it's the active version:

   ```bash
   code --list-extensions --show-versions | grep intellij
   ```

   You should see `jungsehui.custom-intellij-nav@${VERSION}`.

8. Tell the user to **reload window** in VS Code (`cmd+shift+p` →
   `Developer: Reload Window`). The new code does not take effect until
   reload.

If anything fails, stop and report. Do not silently retry.
