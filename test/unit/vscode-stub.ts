/**
 * Stub for the vscode module.
 * Provides minimal type-compatible exports for unit testing.
 */

export const window = {
  createOutputChannel: (name: string) => ({
    appendLine: () => {},
    append: () => {},
    clear: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {},
    name,
  }),
  showInformationMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  showQuickPick: async () => undefined,
  showInputBox: async () => undefined,
  createTerminal: () => ({}),
  withProgress: async (_options: any, task: any) => task({ report: () => {} }),
};

export const workspace = {
  getConfiguration: () => ({
    get: (key: string, defaultValue?: any) => defaultValue,
  }),
  workspaceFolders: [],
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: async () => {},
};

export class TreeItem {
  label: any;
  collapsibleState: any;
  constructor(label: any, collapsibleState?: any) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class ThemeIcon {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}

export enum ProgressLocation {
  Notification = 15,
}

export class EventEmitter {
  event = () => ({ dispose: () => {} });
  fire() {}
  dispose() {}
}

export const Uri = {
  file: (path: string) => ({ fsPath: path, scheme: 'file' }),
  parse: (str: string) => ({ fsPath: str, scheme: 'file' }),
};

export const TaskScope = {
  Workspace: 2,
};

export enum ShellQuoting {
  Escape = 1,
  Strong = 2,
  Weak = 3,
}

export class ShellExecution {
  constructor(public command: string, public args?: any[], public options?: any) {}
}

export class Task {
  constructor(
    public definition: any,
    public scope: any,
    public name: string,
    public source: string,
    public execution?: any,
  ) {}
}

export const languages = {
  registerCodeLensProvider: () => ({ dispose: () => {} }),
};

export class CodeLens {
  range: any;
  command: any;
  constructor(range: any, command?: any) {
    this.range = range;
    this.command = command;
  }
}

export class Range {
  start: any;
  end: any;
  constructor(startLine: number, startChar: number, endLine: number, endChar: number) {
    this.start = { line: startLine, character: startChar };
    this.end = { line: endLine, character: endChar };
  }
}

export class Position {
  constructor(public line: number, public character: number) {}
}
