/**
 * Container Output Panel (3.5)
 *
 * Enhanced output channel with clickable file paths and structured logging.
 * The actual problem matchers are defined in package.json.
 * This module provides helper methods for formatted output.
 */

import * as vscode from 'vscode';

/**
 * Create the DevDocker output channel.
 */
export function createOutputChannel(): vscode.OutputChannel {
  return vscode.window.createOutputChannel('DevDocker');
}

/**
 * Log a section header to the output channel.
 */
export function logHeader(
  outputChannel: vscode.OutputChannel,
  title: string,
): void {
  const separator = '─'.repeat(60);
  outputChannel.appendLine('');
  outputChannel.appendLine(separator);
  outputChannel.appendLine(`  ${title}`);
  outputChannel.appendLine(separator);
}

/**
 * Log build start info to the output channel.
 */
export function logBuildStart(
  outputChannel: vscode.OutputChannel,
  imageName: string,
  imageTag: string,
  buildDir: string,
): void {
  logHeader(outputChannel, `Building ${imageName}`);
  outputChannel.appendLine(`  Tag:     ${imageTag}`);
  outputChannel.appendLine(`  Context: ${buildDir}`);
  outputChannel.appendLine('');
}

/**
 * Log exec start info to the output channel.
 */
export function logExecStart(
  outputChannel: vscode.OutputChannel,
  imageName: string,
  command: string,
  isDevcontainer: boolean,
): void {
  logHeader(outputChannel, `Executing in ${imageName}`);
  outputChannel.appendLine(`  Command: ${command}`);
  if (isDevcontainer) {
    outputChannel.appendLine('  Env:     Devcontainer (docker-from-docker)');
  }
  outputChannel.appendLine('');
}

/**
 * Log a result (success or failure) to the output channel.
 */
export function logResult(
  outputChannel: vscode.OutputChannel,
  success: boolean,
  message: string,
): void {
  const prefix = success ? '[OK]' : '[FAIL]';
  outputChannel.appendLine(`${prefix} ${message}`);
  outputChannel.appendLine('');
}

/**
 * Log a timestamp-prefixed message.
 */
export function logTimestamped(
  outputChannel: vscode.OutputChannel,
  message: string,
): void {
  const now = new Date().toISOString().slice(11, 19); // HH:MM:SS
  outputChannel.appendLine(`[${now}] ${message}`);
}
