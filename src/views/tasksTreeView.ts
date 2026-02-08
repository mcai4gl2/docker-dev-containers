/**
 * Tasks TreeView (2.2)
 *
 * Activity bar sidebar panel listing devdocker.json tasks grouped by source file.
 * Shows task type icon (exec vs shell). Click to run task.
 * Context menu: Run, Open Shell, Edit devdocker.json, Copy Command.
 */

import * as vscode from 'vscode';
import { DevDockerTaskWithSource } from '../discovery/taskDiscovery';

/** Types of tree items in the tasks view */
type TaskTreeItemType = 'group' | 'task';

export class TasksTreeDataProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TaskTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private tasks: DevDockerTaskWithSource[] = [];

  update(tasks: DevDockerTaskWithSource[]): void {
    this.tasks = tasks;
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TaskTreeItem): TaskTreeItem[] {
    if (!element) {
      // Root level: group by source file
      const groups = new Map<string, DevDockerTaskWithSource[]>();
      for (const task of this.tasks) {
        const existing = groups.get(task.sourceFile) ?? [];
        existing.push(task);
        groups.set(task.sourceFile, existing);
      }

      if (groups.size === 0) {
        return [];
      }

      // If only one group, skip grouping and show tasks directly
      if (groups.size === 1) {
        const [, tasks] = [...groups.entries()][0];
        return tasks.map(t => this.createTaskItem(t));
      }

      return [...groups.entries()].map(([sourceFile, tasks]) => {
        const item = new TaskTreeItem(
          sourceFile,
          'group',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          sourceFile,
        );
        item.iconPath = new vscode.ThemeIcon('file-code');
        item.contextValue = 'devdocker-task-group';
        item.description = `${tasks.length} task(s)`;
        return item;
      });
    }

    if (element.itemType === 'group' && element.sourceFile) {
      // Child level: tasks in this group
      const tasks = this.tasks.filter(t => t.sourceFile === element.sourceFile);
      return tasks.map(t => this.createTaskItem(t));
    }

    return [];
  }

  private createTaskItem(task: DevDockerTaskWithSource): TaskTreeItem {
    const item = new TaskTreeItem(
      task.name,
      'task',
      vscode.TreeItemCollapsibleState.None,
      task,
      task.sourceFile,
    );

    item.description = `${task.type} | ${task.image}`;
    item.tooltip = [
      task.description,
      `Type: ${task.type}`,
      `Image: ${task.image}`,
      task.command ? `Command: ${task.command}` : undefined,
      `Source: ${task.sourceFile}`,
    ].filter(Boolean).join('\n');

    item.iconPath = new vscode.ThemeIcon(
      task.type === 'shell' ? 'terminal' : 'play',
    );

    item.contextValue = task.type === 'shell' ? 'devdocker-task-shell' : 'devdocker-task-exec';

    // Click to run the task
    item.command = {
      command: 'devdocker.runTaskByName',
      title: 'Run Task',
      arguments: [task.name],
    };

    return item;
  }
}

export class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly itemType: TaskTreeItemType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly task?: DevDockerTaskWithSource,
    public readonly sourceFile?: string,
  ) {
    super(label, collapsibleState);
  }
}
