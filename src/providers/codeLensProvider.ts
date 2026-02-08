/**
 * CodeLens Provider for devdocker.json (2.4)
 *
 * Shows clickable CodeLens above each task in devdocker.json files:
 * - "Run" for exec tasks
 * - "Shell" for shell tasks
 * - "Build Image" for all tasks
 */

import * as vscode from 'vscode';

export class DevDockerCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    if (!document.fileName.endsWith('devdocker.json')) {
      return [];
    }

    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();

    let parsed: { tasks?: Array<{ name?: string; type?: string; image?: string; command?: string }> };
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      return [];
    }

    // Find each task's "name" key in the document to position the CodeLens
    for (const task of parsed.tasks) {
      if (!task.name) {
        continue;
      }

      const range = findTaskNameRange(document, task.name);
      if (!range) {
        continue;
      }

      const taskType = task.type ?? 'exec';
      const taskName = task.name;
      const imageName = task.image ?? '';

      if (taskType === 'exec') {
        // Run lens
        lenses.push(
          new vscode.CodeLens(range, {
            title: '$(play) Run',
            command: 'devdocker.runTaskByName',
            arguments: [taskName],
            tooltip: `Run task "${taskName}"`,
          }),
        );
      } else {
        // Shell lens
        lenses.push(
          new vscode.CodeLens(range, {
            title: '$(terminal) Shell',
            command: 'devdocker.runTaskByName',
            arguments: [taskName],
            tooltip: `Open shell for task "${taskName}"`,
          }),
        );
      }

      // Build Image lens
      if (imageName) {
        lenses.push(
          new vscode.CodeLens(range, {
            title: '$(package) Build Image',
            command: 'devdocker.buildImageByName',
            arguments: [imageName],
            tooltip: `Build Docker image "${imageName}"`,
          }),
        );
      }
    }

    return lenses;
  }
}

/**
 * Find the document range for a task's "name" field value.
 * Searches for `"name": "taskName"` pattern and returns the range of that line.
 */
function findTaskNameRange(document: vscode.TextDocument, taskName: string): vscode.Range | null {
  // Escape special regex chars in the task name
  const escaped = taskName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`"name"\\s*:\\s*"${escaped}"`);

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    if (pattern.test(line.text)) {
      return line.range;
    }
  }
  return null;
}
