/**
 * Multi-root Workspace Support (3.4)
 *
 * Discovers images and tasks across all workspace folders.
 * Prefixes with workspace folder name when multiple folders are open
 * for disambiguation.
 */

import * as vscode from 'vscode';
import { discoverDockerImages, DockerImage } from './imageDiscovery';
import { getAllDockerTasks, DevDockerTaskWithSource } from './taskDiscovery';

/** An image with its owning workspace folder for disambiguation */
export interface MultiRootImage extends DockerImage {
  /** The workspace folder this image belongs to */
  workspaceFolder: vscode.WorkspaceFolder;
  /** Display prefix for disambiguation (empty if single-root) */
  folderPrefix: string;
}

/** A task with its owning workspace folder for disambiguation */
export interface MultiRootTask extends DevDockerTaskWithSource {
  /** The workspace folder this task belongs to */
  workspaceFolder: vscode.WorkspaceFolder;
  /** Display prefix for disambiguation (empty if single-root) */
  folderPrefix: string;
}

/**
 * Discover images across all workspace folders.
 */
export function discoverAllImages(): MultiRootImage[] {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return [];
  }

  const isMultiRoot = folders.length > 1;
  const allImages: MultiRootImage[] = [];

  for (const folder of folders) {
    const images = discoverDockerImages(folder);
    const prefix = isMultiRoot ? `${folder.name}: ` : '';

    for (const image of images) {
      allImages.push({
        ...image,
        workspaceFolder: folder,
        folderPrefix: prefix,
      });
    }
  }

  return allImages;
}

/**
 * Discover tasks across all workspace folders.
 */
export function discoverAllTasks(): MultiRootTask[] {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return [];
  }

  const isMultiRoot = folders.length > 1;
  const allTasks: MultiRootTask[] = [];

  for (const folder of folders) {
    const tasks = getAllDockerTasks(folder);
    const prefix = isMultiRoot ? `${folder.name}: ` : '';

    for (const task of tasks) {
      allTasks.push({
        ...task,
        workspaceFolder: folder,
        folderPrefix: prefix,
      });
    }
  }

  return allTasks;
}

/**
 * Get a unique display name for a multi-root image.
 */
export function getMultiRootImageLabel(image: MultiRootImage): string {
  return `${image.folderPrefix}${image.name}`;
}

/**
 * Get a unique display name for a multi-root task.
 */
export function getMultiRootTaskLabel(task: MultiRootTask): string {
  return `${task.folderPrefix}${task.name}`;
}
