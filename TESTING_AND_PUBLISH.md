# DevDocker - Testing & Marketplace Publishing Guide

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Manual Testing Checklist](#manual-testing-checklist)
3. [Unit Tests](#unit-tests)
4. [Integration Tests](#integration-tests)
5. [CI/CD with GitHub Actions](#cicd-with-github-actions)
6. [Packaging](#packaging)
7. [Publishing to VS Code Marketplace](#publishing-to-vs-code-marketplace)
8. [Publishing to Open VSX Registry](#publishing-to-open-vsx-registry)
9. [Release Workflow](#release-workflow)

---

## Local Development Setup

### Prerequisites

- Node.js >= 18
- VS Code >= 1.85.0
- Docker (for end-to-end testing of build/exec/shell commands)

### Install and build

```bash
cd docker-dev-containers
npm install
npm run compile
```

### Run in Extension Development Host

1. Open the `docker-dev-containers` folder in VS Code
2. Press **F5** (or Run > Start Debugging)
3. This launches a new VS Code window (`[Extension Development Host]`) with the extension loaded
4. Open a workspace that has a `docker/` directory with Dockerfiles, or a `devdocker.json`

### Watch mode (auto-recompile on save)

```bash
npm run watch
```

With watch running, after making changes press **Ctrl+Shift+F5** in the Extension Development Host to reload.

---

## Manual Testing Checklist

Use this checklist to verify each feature before publishing a release.

### Phase 1: Core Engine

- [ ] **Image Discovery**: Open a workspace with `docker/` subdirectories containing Dockerfiles. Run `DevDocker: Refresh` and confirm the Output channel shows the correct count.
- [ ] **Metadata Extraction**: Verify image descriptions and tool lists are populated (hover over images in the sidebar).
- [ ] **Task Discovery**: Place a `devdocker.json` in the workspace. Confirm tasks appear after refresh.
- [ ] **Settings**: Change `devdocker.defaults.networkMode` in Settings. Run a command and verify the new network mode is used.
- [ ] **Build All**: Run `DevDocker: Build All Images`. Confirm progress notification, output log, and success message.
- [ ] **Build Single**: Run `DevDocker: Build Image`, pick one. Confirm base is built first if needed.
- [ ] **Auto-build**: Delete a built image (`docker rmi <tag>`), then run an exec/shell command against it. Confirm it auto-builds.
- [ ] **Exec**: Run `DevDocker: Run Command`, enter a command. Verify output in the DevDocker Output channel.
- [ ] **Shell**: Run `DevDocker: Open Shell`. Verify an interactive terminal opens with `docker run -it`.
- [ ] **File Watchers**: Add/remove a Dockerfile or devdocker.json. Verify the sidebar and task list auto-refresh.

### Phase 2: VS Code Integration

- [ ] **Task Provider**: Open `Tasks: Run Task` (Ctrl+Shift+P). Verify "DevDocker: Build All Images", per-image build/shell tasks, and devdocker.json tasks all appear.
- [ ] **tasks.json**: Add a manual `{ "type": "devdocker", "image": "...", "command": "..." }` task to `.vscode/tasks.json`. Verify it runs correctly.
- [ ] **Images TreeView**: Click the DevDocker icon in the activity bar. Verify images listed with tool children. Right-click context menu: Build, Rebuild, Shell, Copy Tag.
- [ ] **Tasks TreeView**: Verify tasks grouped by source file. Click a task to run it. Right-click: Run, Open Shell, Edit devdocker.json, Copy Command.
- [ ] **Build Status Icons**: Build an image, refresh. Verify green check icon. Remove the image, refresh. Verify gray circle icon.
- [ ] **Terminal Profiles**: Run `DevDocker: Open Container Terminal`. Verify quick pick shows non-base images and a terminal opens on selection.
- [ ] **CodeLens**: Open a `devdocker.json` file. Verify `Run`/`Shell` and `Build Image` links above each task's `"name"` line. Click each to confirm they work.
- [ ] **Status Bar**: Verify container count in status bar. Start a long-running container, confirm count updates. Click to see the stop-container picker.

### Phase 3: Polish & Advanced

- [ ] **Scaffold Config**: Run `DevDocker: Create devdocker.json`. Walk through image pick, task type, name, command. Verify file is created and opens.
- [ ] **Scaffold Config (existing)**: Run it again in the same directory. Verify "Add Task" prompt appends to the existing file.
- [ ] **Scaffold Image**: Run `DevDocker: Create Docker Image`. Enter a name and optional tools. Verify `docker/<name>/Dockerfile` is created from template.
- [ ] **Multi-root**: Open a multi-root workspace (File > Add Folder to Workspace). Verify images/tasks from all folders appear, prefixed with folder name.
- [ ] **Devcontainer**: Open the project inside a devcontainer. Verify `HOST_WORKSPACE_FOLDER` is set and volume paths are remapped correctly.

---

## Unit Tests

### Setup

Install the test runner:

```bash
npm install --save-dev mocha @types/mocha
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test:unit": "mocha --require ts-node/register 'test/unit/**/*.test.ts'"
  }
}
```

### What to unit test

These modules have no VS Code API dependency and can be tested directly:

| Module | Test file | Key cases |
|--------|-----------|-----------|
| `utils/dockerfileParser.ts` | `test/unit/dockerfileParser.test.ts` | Go install, apt-get, pip, npm patterns; description extraction; empty/malformed Dockerfiles |
| `utils/placeholder.ts` | `test/unit/placeholder.test.ts` | `{workspaceFolder}`, `{project_root}`, `${VAR}` resolution; missing env vars |
| `utils/platform.ts` | `test/unit/platform.test.ts` | uid:gid format on Linux; Windows fallback |
| `docker/devcontainer.ts` | `test/unit/devcontainer.test.ts` | Volume path remapping; detection heuristics |
| `config/merger.ts` | `test/unit/merger.test.ts` | Task overrides defaults; missing fields fall back; env merge |

### Example test

```typescript
// test/unit/dockerfileParser.test.ts
import * as assert from 'assert';
import { extractDockerfileMetadata } from '../../src/utils/dockerfileParser';

describe('extractDockerfileMetadata', () => {
  it('extracts description from comment containing "container"', () => {
    const content = '# gRPC development tools container\nFROM ubuntu:22.04\n';
    const meta = extractDockerfileMetadata(content);
    assert.strictEqual(meta.description, 'gRPC development tools container');
  });

  it('extracts tools from go install', () => {
    const content = 'RUN go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest\n';
    const meta = extractDockerfileMetadata(content);
    assert.ok(meta.tools.includes('grpcurl'));
  });

  it('extracts tools from apt-get install', () => {
    const content = 'RUN apt-get install -y curl jq\\\n && rm -rf\n';
    const meta = extractDockerfileMetadata(content);
    assert.ok(meta.tools.includes('curl'));
    assert.ok(meta.tools.includes('jq'));
  });

  it('returns empty metadata for empty Dockerfile', () => {
    const meta = extractDockerfileMetadata('');
    assert.strictEqual(meta.description, null);
    assert.deepStrictEqual(meta.tools, []);
  });
});
```

---

## Integration Tests

Integration tests run inside a VS Code instance using `@vscode/test-electron`.

### Setup

```bash
npm install --save-dev @vscode/test-electron
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test:integration": "node ./out/test/runTest.js"
  }
}
```

### Test runner

Create `test/integration/runTest.ts`:

```typescript
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '../../');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');

  // A fixture workspace with docker/ and devdocker.json for testing
  const testWorkspace = path.resolve(__dirname, '../../test/fixtures/workspace');

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [testWorkspace, '--disable-extensions'],
  });
}

main().catch(err => {
  console.error('Failed to run tests', err);
  process.exit(1);
});
```

### Test suite entry

Create `test/integration/suite/index.ts`:

```typescript
import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 30000 });
  const testsRoot = path.resolve(__dirname, '.');

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) return reject(err);
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
      mocha.run(failures => {
        if (failures > 0) reject(new Error(`${failures} tests failed.`));
        else resolve();
      });
    });
  });
}
```

### Test fixture workspace

Create a minimal fixture:

```
test/fixtures/workspace/
├── docker/
│   ├── base/
│   │   └── Dockerfile        # FROM ubuntu:22.04
│   └── test-tools/
│       └── Dockerfile        # # test tools container\nFROM base\nRUN apt-get install -y curl
└── devdocker.json            # { "tasks": [{ "name": "Test", "type": "exec", "image": "test-tools", "command": "echo hello" }] }
```

### Key integration test cases

| Test | What it validates |
|------|-------------------|
| Extension activates | `vscode.extensions.getExtension('devdocker.devdocker')` is defined and active |
| Commands registered | All 20 commands exist via `vscode.commands.getCommands()` |
| Image discovery | `DevDocker: Refresh` populates the images tree view |
| Task discovery | Tasks from fixture `devdocker.json` appear |
| CodeLens | Open `devdocker.json`, request CodeLens, assert Run/Shell/Build lenses exist |
| Scaffold config | Run `DevDocker: Create devdocker.json` programmatically, verify file created |
| Scaffold image | Run `DevDocker: Create Docker Image`, verify Dockerfile created |

---

## CI/CD with GitHub Actions

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Compile
        run: npm run compile

      - name: Unit tests
        run: npm run test:unit

      - name: Integration tests
        run: xvfb-run -a npm run test:integration
        # xvfb required for headless VS Code on Linux

  package:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run compile

      - name: Package VSIX
        run: npx @vscode/vsce package

      - name: Upload VSIX artifact
        uses: actions/upload-artifact@v4
        with:
          name: devdocker-vsix
          path: '*.vsix'
```

---

## Packaging

### Install vsce (VS Code Extension CLI)

```bash
npm install -g @vscode/vsce
```

### Pre-publish checks

Before packaging, verify:

```bash
npm run compile          # No TypeScript errors
npm run lint             # No lint warnings
npm run test:unit        # All unit tests pass
```

### Build the VSIX package

```bash
vsce package
```

This creates `devdocker-0.3.0.vsix` in the project root.

### Test the VSIX locally

```bash
code --install-extension devdocker-0.3.0.vsix
```

Open a project with `docker/` and `devdocker.json` to verify everything works.

To uninstall:

```bash
code --uninstall-extension devdocker.devdocker
```

---

## Publishing to VS Code Marketplace

### One-time setup

1. **Create a publisher** at https://marketplace.visualstudio.com/manage

   - Sign in with a Microsoft account
   - Create a publisher with ID matching `package.json` `"publisher"` field (currently `"devdocker"`)

2. **Create a Personal Access Token (PAT)**

   - Go to https://dev.azure.com → User Settings → Personal Access Tokens
   - Create a token with scope: **Marketplace > Manage**
   - Set Organization to **All accessible organizations**
   - Copy the token (it's shown only once)

3. **Login with vsce**

   ```bash
   vsce login devdocker
   # Paste your PAT when prompted
   ```

### Before publishing - required fields

Ensure `package.json` has these fields:

| Field | Required | Current |
|-------|----------|---------|
| `name` | Yes | `devdocker` |
| `displayName` | Yes | `DevDocker - Docker Development Tools` |
| `description` | Yes | Set |
| `version` | Yes | `0.3.0` |
| `publisher` | Yes | `devdocker` |
| `engines.vscode` | Yes | `^1.85.0` |
| `repository` | Recommended | Add your GitHub repo URL |
| `license` | Recommended | Add (e.g., `MIT`) |
| `icon` | Recommended | 128x128 PNG in `media/icon.png` |
| `categories` | Recommended | Update to `["Other", "Testing"]` or similar |

Add these to `package.json` before publishing:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/devdocker"
  },
  "license": "MIT",
  "icon": "media/icon.png"
}
```

### Publish

```bash
# Dry run (validates without publishing)
vsce publish --dry-run

# Publish for real
vsce publish
```

### Publish a specific version

```bash
vsce publish 0.3.0        # Explicit version
vsce publish minor         # Bump minor: 0.3.0 -> 0.4.0
vsce publish patch         # Bump patch: 0.3.0 -> 0.3.1
```

### Verify

After publishing, the extension will be available at:
```
https://marketplace.visualstudio.com/items?itemName=devdocker.devdocker
```

It may take a few minutes for the listing to appear.

---

## Publishing to Open VSX Registry

Open VSX is the marketplace for VS Code forks (VS Codium, Gitpod, etc.).

### One-time setup

1. Create an account at https://open-vsx.org
2. Generate a token at https://open-vsx.org/user-settings/tokens

### Install ovsx

```bash
npm install -g ovsx
```

### Publish

```bash
# Package first
vsce package

# Publish to Open VSX
ovsx publish devdocker-0.3.0.vsix -p <your-openvsx-token>
```

---

## Release Workflow

### Recommended release process

1. **Update version** in `package.json`

2. **Update CHANGELOG** (if you create one)

3. **Run full validation**
   ```bash
   npm run compile
   npm run lint
   npm run test:unit
   # npm run test:integration  (if set up)
   ```

4. **Package and test locally**
   ```bash
   vsce package
   code --install-extension devdocker-*.vsix
   # Manual smoke test
   ```

5. **Commit, tag, and push**
   ```bash
   git add -A
   git commit -m "Release v0.3.0"
   git tag v0.3.0
   git push origin main --tags
   ```

6. **Publish**
   ```bash
   vsce publish
   ovsx publish devdocker-*.vsix -p <token>
   ```

7. **Create a GitHub Release** (optional but recommended)
   ```bash
   gh release create v0.3.0 devdocker-0.3.0.vsix \
     --title "v0.3.0" \
     --notes "Initial release with all 3 phases complete."
   ```

### Automated publishing via GitHub Actions

Add to `.github/workflows/ci.yml` for tag-triggered publishing:

```yaml
  publish:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run compile

      - name: Publish to VS Code Marketplace
        run: npx @vscode/vsce publish
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}

      - name: Publish to Open VSX
        run: npx ovsx publish *.vsix
        env:
          OVSX_PAT: ${{ secrets.OVSX_PAT }}
```

Required repository secrets:
- `VSCE_PAT`: Your VS Code Marketplace personal access token
- `OVSX_PAT`: Your Open VSX personal access token
