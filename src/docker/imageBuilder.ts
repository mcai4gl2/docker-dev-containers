/**
 * Docker Image Builder
 *
 * Builds Docker images with dependency ordering and progress reporting.
 *
 * Reference: tools/docker_build.py
 */

import * as vscode from 'vscode';
import { DockerImage, getBuildOrder, getImageTag } from '../discovery/imageDiscovery';
import { runDockerCommand, imageExists } from './dockerClient';
import { getGhcrRegistry } from '../config/settings';

/**
 * Build a single Docker image.
 *
 * @returns true if build succeeded
 */
export async function buildImage(
  image: DockerImage,
  outputChannel: vscode.OutputChannel,
  options?: { cacheFromGhcr?: boolean },
): Promise<boolean> {
  const ghcrRegistry = options?.cacheFromGhcr ? getGhcrRegistry() : '';

  outputChannel.appendLine(`Building ${image.tag}...`);
  outputChannel.appendLine(`  Build context: ${image.path}`);
  outputChannel.show(true);

  const args: string[] = ['build', '-t', image.tag];

  // Add GHCR cache options
  if (ghcrRegistry) {
    const ghcrImage = `${ghcrRegistry}:${image.name}`;
    args.push('--cache-from', ghcrImage);

    // For non-base images, set BASE_IMAGE build arg to use GHCR base
    if (image.name !== 'base') {
      const ghcrBase = `${ghcrRegistry}:base`;
      args.push('--build-arg', `BASE_IMAGE=${ghcrBase}`);
    }
  }

  args.push(image.path);

  const exitCode = await runDockerCommand(args, outputChannel);

  if (exitCode === 0) {
    outputChannel.appendLine(`\nSuccessfully built ${image.tag}`);
  } else {
    outputChannel.appendLine(`\nFailed to build ${image.tag} (exit code: ${exitCode})`);
  }

  return exitCode === 0;
}

/**
 * Build all images in dependency order with progress.
 */
export async function buildAllImages(
  images: DockerImage[],
  outputChannel: vscode.OutputChannel,
  options?: { cacheFromGhcr?: boolean },
): Promise<boolean> {
  const ordered = getBuildOrder(images);

  if (ordered.length === 0) {
    vscode.window.showWarningMessage('DevDocker: No Docker images found to build.');
    return false;
  }

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'DevDocker: Building images',
      cancellable: false,
    },
    async (progress) => {
      let allSucceeded = true;

      for (let i = 0; i < ordered.length; i++) {
        const image = ordered[i];
        progress.report({
          message: `${image.name} (${i + 1}/${ordered.length})`,
          increment: (100 / ordered.length),
        });

        const success = await buildImage(image, outputChannel, options);
        if (!success) {
          allSucceeded = false;
          vscode.window.showErrorMessage(`DevDocker: Failed to build ${image.name}. See Output for details.`);
          break;
        }
      }

      if (allSucceeded) {
        vscode.window.showInformationMessage(`DevDocker: All ${ordered.length} images built successfully.`);
      }

      return allSucceeded;
    },
  );
}

/**
 * Build a specific image, building its base dependency first if needed.
 */
export async function buildImageWithDependencies(
  image: DockerImage,
  allImages: DockerImage[],
  outputChannel: vscode.OutputChannel,
  options?: { cacheFromGhcr?: boolean },
): Promise<boolean> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `DevDocker: Building ${image.name}`,
      cancellable: false,
    },
    async (progress) => {
      // Build base image first if this isn't the base and base exists
      if (image.name !== 'base') {
        const baseImage = allImages.find(i => i.name === 'base');
        if (baseImage) {
          progress.report({ message: 'Building dependency: base' });
          const baseSuccess = await buildImage(baseImage, outputChannel, options);
          if (!baseSuccess) {
            vscode.window.showErrorMessage('DevDocker: Failed to build base image.');
            return false;
          }
        }
      }

      progress.report({ message: `Building ${image.name}` });
      const success = await buildImage(image, outputChannel, options);

      if (success) {
        vscode.window.showInformationMessage(`DevDocker: ${image.name} built successfully.`);
      } else {
        vscode.window.showErrorMessage(`DevDocker: Failed to build ${image.name}. See Output for details.`);
      }

      return success;
    },
  );
}

/**
 * Ensure an image is built, auto-building if not found locally.
 *
 * @returns true if image is available (already existed or built successfully)
 */
export async function ensureImageBuilt(
  image: DockerImage,
  allImages: DockerImage[],
  outputChannel: vscode.OutputChannel,
): Promise<boolean> {
  if (imageExists(image.tag)) {
    return true;
  }

  outputChannel.appendLine(`Image ${image.tag} not found locally. Auto-building...`);
  return buildImageWithDependencies(image, allImages, outputChannel);
}
