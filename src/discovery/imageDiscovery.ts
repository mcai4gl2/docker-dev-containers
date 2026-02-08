/**
 * Docker Image Discovery
 *
 * Scans a configurable directory (default: docker/) for subdirectories
 * containing Dockerfiles, extracts metadata, and generates image tags.
 *
 * Reference: tools/docker_common.py discover_docker_images()
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { extractDockerfileMetadata, DockerfileMetadata } from '../utils/dockerfileParser';

export interface DockerImage {
  /** Image name (subdirectory name, e.g., "grpc-tools") */
  name: string;
  /** Full Docker tag (e.g., "myproject-grpc-tools:latest") */
  tag: string;
  /** Description extracted from Dockerfile */
  description: string;
  /** Tools detected in the Dockerfile */
  tools: string[];
  /** Absolute path to the image directory */
  path: string;
  /** Absolute path to the Dockerfile */
  dockerfilePath: string;
}

/**
 * Discover Docker images in the workspace.
 *
 * Scans the configured docker directory for subdirectories containing
 * Dockerfiles and extracts metadata from them.
 */
export function discoverDockerImages(workspaceFolder: vscode.WorkspaceFolder): DockerImage[] {
  const config = vscode.workspace.getConfiguration('devdocker');
  const dockerDir = config.get<string>('dockerDirectory', 'docker');
  const imagePrefix = getImagePrefix(workspaceFolder);

  const dockerRoot = path.join(workspaceFolder.uri.fsPath, dockerDir);

  if (!fs.existsSync(dockerRoot)) {
    return [];
  }

  const images: DockerImage[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dockerRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  // Sort entries alphabetically for consistent ordering
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    // Skip hidden directories and common non-image directories
    if (entry.name.startsWith('.') || entry.name === '__pycache__' || entry.name === 'node_modules') {
      continue;
    }

    const dockerfilePath = path.join(dockerRoot, entry.name, 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
      continue;
    }

    let metadata: DockerfileMetadata;
    try {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      metadata = extractDockerfileMetadata(content);
    } catch {
      metadata = { description: null, tools: [] };
    }

    images.push({
      name: entry.name,
      tag: `${imagePrefix}-${entry.name}:latest`,
      description: metadata.description ?? `${entry.name} development tools`,
      tools: metadata.tools,
      path: path.join(dockerRoot, entry.name),
      dockerfilePath,
    });
  }

  return images;
}

/**
 * Get the image tag prefix.
 *
 * Uses the configured imagePrefix setting, or falls back to the
 * workspace folder name.
 */
export function getImagePrefix(workspaceFolder: vscode.WorkspaceFolder): string {
  const config = vscode.workspace.getConfiguration('devdocker');
  const prefix = config.get<string>('imagePrefix', '');
  if (prefix) {
    return prefix;
  }
  return workspaceFolder.name;
}

/**
 * Get the full Docker tag for an image name.
 */
export function getImageTag(imageName: string, workspaceFolder: vscode.WorkspaceFolder): string {
  const prefix = getImagePrefix(workspaceFolder);
  return `${prefix}-${imageName}:latest`;
}

/**
 * Get the build order for images.
 * "base" is always first if present, then others alphabetically.
 */
export function getBuildOrder(images: DockerImage[]): DockerImage[] {
  const baseImage = images.find(i => i.name === 'base');
  const others = images.filter(i => i.name !== 'base').sort((a, b) => a.name.localeCompare(b.name));

  const ordered: DockerImage[] = [];
  if (baseImage) {
    ordered.push(baseImage);
  }
  ordered.push(...others);
  return ordered;
}
