/**
 * File Watcher
 *
 * Watches for Dockerfile and devdocker.json changes to auto-refresh
 * discovered images and tasks.
 */

import * as vscode from 'vscode';

export type RefreshCallback = () => void;

/**
 * Create file watchers for Dockerfiles and devdocker.json files.
 *
 * Returns disposables that should be added to the extension context.
 */
export function createFileWatchers(onRefresh: RefreshCallback): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Watch for Dockerfile changes
  const dockerfileWatcher = vscode.workspace.createFileSystemWatcher('**/docker/**/Dockerfile');
  dockerfileWatcher.onDidCreate(onRefresh);
  dockerfileWatcher.onDidChange(onRefresh);
  dockerfileWatcher.onDidDelete(onRefresh);
  disposables.push(dockerfileWatcher);

  // Watch for devdocker.json changes
  const taskWatcher = vscode.workspace.createFileSystemWatcher('**/devdocker.json');
  taskWatcher.onDidCreate(onRefresh);
  taskWatcher.onDidChange(onRefresh);
  taskWatcher.onDidDelete(onRefresh);
  disposables.push(taskWatcher);

  return disposables;
}
