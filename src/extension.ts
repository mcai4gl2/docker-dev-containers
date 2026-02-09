/**
 * DevDocker VS Code Extension - Entry Point
 *
 * Activation, command registration, and initialization of Phase 1 + Phase 2
 * components: discovery, build, exec, shell, file watchers, task provider,
 * tree views, terminal profiles, CodeLens, and status bar.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { discoverDockerImages, DockerImage } from './discovery/imageDiscovery';
import { getAllDockerTasks, DevDockerTaskWithSource, discoverDevDockerConfigs } from './discovery/taskDiscovery';
import { createFileWatchers } from './discovery/fileWatcher';
import { isDockerAvailable, getDockerEnv } from './docker/dockerClient';
import { buildAllImages, buildImageWithDependencies } from './docker/imageBuilder';
import { execInContainer, shellInContainer, runTask } from './docker/containerRunner';
import { getDefaultContainerSettings } from './config/merger';
import { DevDockerTaskProvider } from './providers/taskProvider';
import { ImagesTreeDataProvider, ImageTreeItem } from './views/imagesTreeView';
import { TasksTreeDataProvider, TaskTreeItem } from './views/tasksTreeView';
import { DevDockerTerminalProfileProvider, buildTerminalArgs, imageDisplayName } from './providers/terminalProvider';
import { DevDockerCodeLensProvider } from './providers/codeLensProvider';
import { DevDockerStatusBar } from './views/statusBar';
import { scaffoldDevDockerConfig } from './commands/scaffoldConfig';
import { scaffoldDockerImage } from './commands/scaffoldImage';
import { discoverAllImages, discoverAllTasks, MultiRootImage, MultiRootTask } from './discovery/multiRoot';
import { logTimestamped } from './views/outputPanel';

/** Cached discovery state */
let cachedImages: DockerImage[] = [];
let cachedTasks: DevDockerTaskWithSource[] = [];

/** Output channel for build logs and exec output */
let outputChannel: vscode.OutputChannel;

/** Phase 2 providers */
let taskProvider: DevDockerTaskProvider;
let imagesTreeProvider: ImagesTreeDataProvider;
let tasksTreeProvider: TasksTreeDataProvider;
let terminalProfileProvider: DevDockerTerminalProfileProvider;
let codeLensProvider: DevDockerCodeLensProvider;
let statusBar: DevDockerStatusBar;

/**
 * Refresh discovered images and tasks, and update all providers.
 * Supports multi-root workspaces (3.4): scans all workspace folders.
 */
function refreshDiscovery(): void {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    cachedImages = [];
    cachedTasks = [];
    return;
  }

  // Multi-root support: discover across all workspace folders
  if (folders.length > 1) {
    const multiImages = discoverAllImages();
    const multiTasks = discoverAllTasks();
    cachedImages = multiImages;
    cachedTasks = multiTasks;
  } else {
    cachedImages = discoverDockerImages(folders[0]);
    cachedTasks = getAllDockerTasks(folders[0]);
  }

  // Update all Phase 2 providers
  taskProvider.update(cachedImages, cachedTasks);
  imagesTreeProvider.update(cachedImages);
  tasksTreeProvider.update(cachedTasks);
  terminalProfileProvider.update(
    cachedImages.filter(i => i.name !== 'base'),
    folders[0].uri.fsPath,
  );
  codeLensProvider.refresh();
  statusBar.refresh();

  logTimestamped(outputChannel,
    `Discovered ${cachedImages.length} image(s), ${cachedTasks.length} task(s)` +
    (folders.length > 1 ? ` across ${folders.length} workspace folders` : ''),
  );
}

/**
 * Get the workspace folder path, or show an error.
 */
function getWorkspacePath(): string | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showErrorMessage('DevDocker: No workspace folder open.');
    return undefined;
  }
  return folder.uri.fsPath;
}

/**
 * Show a quick pick to select a Docker image.
 */
async function pickImage(options?: { includeBase?: boolean }): Promise<DockerImage | undefined> {
  let images = cachedImages;
  if (!options?.includeBase) {
    images = images.filter(i => i.name !== 'base');
  }

  if (images.length === 0) {
    vscode.window.showWarningMessage('DevDocker: No Docker images found. Check your docker/ directory.');
    return undefined;
  }

  const items = images.map(img => ({
    label: img.name,
    description: img.tag,
    detail: img.description + (img.tools.length > 0 ? ` | Tools: ${img.tools.join(', ')}` : ''),
    image: img,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a Docker image',
  });

  return picked?.image;
}

/**
 * Show a quick pick to select a devdocker.json task.
 */
async function pickTask(): Promise<DevDockerTaskWithSource | undefined> {
  if (cachedTasks.length === 0) {
    vscode.window.showWarningMessage('DevDocker: No tasks found. Add a devdocker.json file to your project.');
    return undefined;
  }

  const items = cachedTasks.map(task => ({
    label: task.name,
    description: `${task.type} | ${task.image}`,
    detail: `${task.description ?? ''} (from ${task.sourceFile})`,
    task,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a task to run',
  });

  return picked?.task;
}

/**
 * Find a DockerImage by name from cached images.
 */
function findImage(name: string): DockerImage | undefined {
  return cachedImages.find(i => i.name === name);
}

/**
 * Find a task by name from cached tasks.
 */
function findTask(name: string): DevDockerTaskWithSource | undefined {
  return cachedTasks.find(t => t.name === name);
}

/**
 * Run a task by its name (used by CodeLens and tree view click).
 */
async function runTaskByName(taskName: string): Promise<void> {
  const workspacePath = getWorkspacePath();
  if (!workspacePath) { return; }

  const task = findTask(taskName);
  if (!task) {
    vscode.window.showErrorMessage(`DevDocker: Task "${taskName}" not found.`);
    return;
  }

  const image = findImage(task.image);
  if (!image) {
    vscode.window.showErrorMessage(
      `DevDocker: Image "${task.image}" referenced by task "${taskName}" not found.`,
    );
    return;
  }

  await runTask(task, image, cachedImages, workspacePath, outputChannel);
}

export function activate(context: vscode.ExtensionContext): void {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel('DevDocker');
  context.subscriptions.push(outputChannel);

  // ── Phase 2: Initialize providers ────────────────────────────────────

  taskProvider = new DevDockerTaskProvider();
  imagesTreeProvider = new ImagesTreeDataProvider();
  tasksTreeProvider = new TasksTreeDataProvider();
  terminalProfileProvider = new DevDockerTerminalProfileProvider();
  codeLensProvider = new DevDockerCodeLensProvider();
  statusBar = new DevDockerStatusBar();

  // Register task provider (2.1)
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(DevDockerTaskProvider.type, taskProvider),
  );

  // Register tree views (2.2)
  context.subscriptions.push(
    vscode.window.createTreeView('devdocker.imagesView', {
      treeDataProvider: imagesTreeProvider,
      showCollapseAll: true,
    }),
  );
  context.subscriptions.push(
    vscode.window.createTreeView('devdocker.tasksView', {
      treeDataProvider: tasksTreeProvider,
      showCollapseAll: true,
    }),
  );

  // Register terminal profile provider (2.3)
  context.subscriptions.push(
    vscode.window.registerTerminalProfileProvider(
      'devdocker.terminalProfile',
      terminalProfileProvider,
    ),
  );

  // Register CodeLens provider (2.4)
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { pattern: '**/devdocker.json' },
      codeLensProvider,
    ),
  );

  // Start status bar (2.5)
  statusBar.start();
  context.subscriptions.push(statusBar);

  // ── Initial discovery ────────────────────────────────────────────────

  refreshDiscovery();

  // File watchers for auto-refresh
  const watchers = createFileWatchers(() => {
    refreshDiscovery();
  });
  context.subscriptions.push(...watchers);

  // ── Phase 1 Commands ─────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.buildAll', async () => {
      if (cachedImages.length === 0) {
        vscode.window.showWarningMessage('DevDocker: No Docker images found.');
        return;
      }
      await buildAllImages(cachedImages, outputChannel);
      imagesTreeProvider.refresh(); // Refresh build status icons
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.buildImage', async () => {
      const image = await pickImage({ includeBase: true });
      if (!image) { return; }
      await buildImageWithDependencies(image, cachedImages, outputChannel);
      imagesTreeProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.shell', async () => {
      const workspacePath = getWorkspacePath();
      if (!workspacePath) { return; }

      const image = await pickImage();
      if (!image) { return; }

      const settings = getDefaultContainerSettings();
      await shellInContainer(image, cachedImages, settings, workspacePath, outputChannel);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.exec', async () => {
      const workspacePath = getWorkspacePath();
      if (!workspacePath) { return; }

      const image = await pickImage();
      if (!image) { return; }

      const command = await vscode.window.showInputBox({
        prompt: `Command to run in ${image.name}`,
        placeHolder: 'e.g., grpcurl -plaintext localhost:50051 list',
      });
      if (!command) { return; }

      const settings = getDefaultContainerSettings();
      await execInContainer(image, cachedImages, command, settings, workspacePath, outputChannel);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.runTask', async () => {
      const workspacePath = getWorkspacePath();
      if (!workspacePath) { return; }

      const task = await pickTask();
      if (!task) { return; }

      const image = findImage(task.image);
      if (!image) {
        vscode.window.showErrorMessage(
          `DevDocker: Image "${task.image}" referenced by task "${task.name}" not found.`,
        );
        return;
      }

      await runTask(task, image, cachedImages, workspacePath, outputChannel);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.refresh', () => {
      refreshDiscovery();
      vscode.window.showInformationMessage(
        `DevDocker: Found ${cachedImages.length} image(s) and ${cachedTasks.length} task(s).`,
      );
    }),
  );

  // ── Phase 2 Commands ─────────────────────────────────────────────────

  // Run task by name (used by CodeLens and tree view click)
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.runTaskByName', async (taskName: string) => {
      await runTaskByName(taskName);
    }),
  );

  // Build image by name (used by CodeLens)
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.buildImageByName', async (imageName: string) => {
      const image = findImage(imageName);
      if (!image) {
        vscode.window.showErrorMessage(`DevDocker: Image "${imageName}" not found.`);
        return;
      }
      await buildImageWithDependencies(image, cachedImages, outputChannel);
      imagesTreeProvider.refresh();
    }),
  );

  // Show running containers (status bar click)
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.showRunningContainers', async () => {
      await statusBar.showContainerPicker();
    }),
  );

  // ── Tree View context menu commands ──────────────────────────────────

  // Images: Build from tree
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.buildImageFromTree', async (item: ImageTreeItem) => {
      if (!item.image) { return; }
      await buildImageWithDependencies(item.image, cachedImages, outputChannel);
      imagesTreeProvider.refresh();
    }),
  );

  // Images: Rebuild from tree
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.rebuildImage', async (item: ImageTreeItem) => {
      if (!item.image) { return; }
      await buildImageWithDependencies(item.image, cachedImages, outputChannel);
      imagesTreeProvider.refresh();
    }),
  );

  // Images: Open shell from tree
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.openShellForImage', async (item: ImageTreeItem) => {
      if (!item.image) { return; }
      const workspacePath = getWorkspacePath();
      if (!workspacePath) { return; }

      const settings = getDefaultContainerSettings();
      await shellInContainer(item.image, cachedImages, settings, workspacePath, outputChannel);
    }),
  );

  // Images: Copy tag
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.copyImageTag', async (item: ImageTreeItem) => {
      if (!item.image) { return; }
      await vscode.env.clipboard.writeText(item.image.tag);
      vscode.window.showInformationMessage(`Copied: ${item.image.tag}`);
    }),
  );

  // Tasks: Run from tree
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.runTaskFromTree', async (item: TaskTreeItem) => {
      if (!item.task) { return; }
      await runTaskByName(item.task.name);
    }),
  );

  // Tasks: Open shell from tree
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.openShellFromTree', async (item: TaskTreeItem) => {
      if (!item.task) { return; }
      const workspacePath = getWorkspacePath();
      if (!workspacePath) { return; }

      const image = findImage(item.task.image);
      if (!image) {
        vscode.window.showErrorMessage(`DevDocker: Image "${item.task.image}" not found.`);
        return;
      }

      const settings = getDefaultContainerSettings();
      await shellInContainer(image, cachedImages, settings, workspacePath, outputChannel);
    }),
  );

  // Tasks: Edit devdocker.json
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.editDevDockerJson', async (item: TaskTreeItem) => {
      const sourceFile = item.sourceFile ?? item.task?.sourceFile;
      if (!sourceFile) { return; }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) { return; }

      const filePath = path.join(workspaceFolder.uri.fsPath, sourceFile);
      const doc = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(doc);
    }),
  );

  // Tasks: Copy command
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.copyCommand', async (item: TaskTreeItem) => {
      if (!item.task?.command) {
        vscode.window.showWarningMessage('DevDocker: This task has no command to copy.');
        return;
      }
      await vscode.env.clipboard.writeText(item.task.command);
      vscode.window.showInformationMessage(`Copied: ${item.task.command}`);
    }),
  );

  // Terminal profile: Open container terminal (quick pick)
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.openTerminalProfile', async () => {
      const workspacePath = getWorkspacePath();
      if (!workspacePath) { return; }

      const nonBaseImages = cachedImages.filter(i => i.name !== 'base');
      if (nonBaseImages.length === 0) {
        vscode.window.showWarningMessage('DevDocker: No images available for terminal profiles.');
        return;
      }

      const items = nonBaseImages.map(img => ({
        label: imageDisplayName(img.name),
        description: img.tag,
        detail: img.description,
        image: img,
      }));

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a container to open as terminal',
      });

      if (!picked) { return; }

      const args = buildTerminalArgs(picked.image, workspacePath);
      const terminal = vscode.window.createTerminal({
        name: imageDisplayName(picked.image.name),
        shellPath: 'docker',
        shellArgs: args,
        env: getDockerEnv(),
      });
      terminal.show();
    }),
  );

  // ── Phase 3 Commands ─────────────────────────────────────────────────

  // Scaffold devdocker.json (3.1)
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.createConfig', async () => {
      await scaffoldDevDockerConfig(cachedImages);
      refreshDiscovery();
    }),
  );

  // Scaffold Docker image (3.2)
  context.subscriptions.push(
    vscode.commands.registerCommand('devdocker.createImage', async () => {
      await scaffoldDockerImage();
      refreshDiscovery();
    }),
  );

  // ── Log activation ───────────────────────────────────────────────────

  outputChannel.appendLine('DevDocker extension activated (Phase 1 + Phase 2 + Phase 3).');
  if (!isDockerAvailable()) {
    outputChannel.appendLine('Warning: Docker command not found. Build and run commands will not work.');
  }
}

export function deactivate(): void {
  // Cleanup handled by disposables
}
