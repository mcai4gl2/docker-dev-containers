"use strict";
/**
 * Stub for the vscode module.
 * Provides minimal type-compatible exports for unit testing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Position = exports.Range = exports.CodeLens = exports.languages = exports.Task = exports.ShellExecution = exports.ShellQuoting = exports.TaskScope = exports.Uri = exports.EventEmitter = exports.ProgressLocation = exports.ThemeIcon = exports.TreeItemCollapsibleState = exports.TreeItem = exports.commands = exports.workspace = exports.window = void 0;
exports.window = {
    createOutputChannel: (name) => ({
        appendLine: () => { },
        append: () => { },
        clear: () => { },
        show: () => { },
        hide: () => { },
        dispose: () => { },
        name,
    }),
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    showErrorMessage: async () => undefined,
    showQuickPick: async () => undefined,
    showInputBox: async () => undefined,
    createTerminal: () => ({}),
    withProgress: async (_options, task) => task({ report: () => { } }),
};
exports.workspace = {
    getConfiguration: () => ({
        get: (key, defaultValue) => defaultValue,
    }),
    workspaceFolders: [],
};
exports.commands = {
    registerCommand: () => ({ dispose: () => { } }),
    executeCommand: async () => { },
};
class TreeItem {
    label;
    collapsibleState;
    constructor(label, collapsibleState) {
        this.label = label;
        this.collapsibleState = collapsibleState;
    }
}
exports.TreeItem = TreeItem;
var TreeItemCollapsibleState;
(function (TreeItemCollapsibleState) {
    TreeItemCollapsibleState[TreeItemCollapsibleState["None"] = 0] = "None";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
})(TreeItemCollapsibleState || (exports.TreeItemCollapsibleState = TreeItemCollapsibleState = {}));
class ThemeIcon {
    id;
    constructor(id) {
        this.id = id;
    }
}
exports.ThemeIcon = ThemeIcon;
var ProgressLocation;
(function (ProgressLocation) {
    ProgressLocation[ProgressLocation["Notification"] = 15] = "Notification";
})(ProgressLocation || (exports.ProgressLocation = ProgressLocation = {}));
class EventEmitter {
    event = () => ({ dispose: () => { } });
    fire() { }
    dispose() { }
}
exports.EventEmitter = EventEmitter;
exports.Uri = {
    file: (path) => ({ fsPath: path, scheme: 'file' }),
    parse: (str) => ({ fsPath: str, scheme: 'file' }),
};
exports.TaskScope = {
    Workspace: 2,
};
var ShellQuoting;
(function (ShellQuoting) {
    ShellQuoting[ShellQuoting["Escape"] = 1] = "Escape";
    ShellQuoting[ShellQuoting["Strong"] = 2] = "Strong";
    ShellQuoting[ShellQuoting["Weak"] = 3] = "Weak";
})(ShellQuoting || (exports.ShellQuoting = ShellQuoting = {}));
class ShellExecution {
    command;
    args;
    options;
    constructor(command, args, options) {
        this.command = command;
        this.args = args;
        this.options = options;
    }
}
exports.ShellExecution = ShellExecution;
class Task {
    definition;
    scope;
    name;
    source;
    execution;
    constructor(definition, scope, name, source, execution) {
        this.definition = definition;
        this.scope = scope;
        this.name = name;
        this.source = source;
        this.execution = execution;
    }
}
exports.Task = Task;
exports.languages = {
    registerCodeLensProvider: () => ({ dispose: () => { } }),
};
class CodeLens {
    range;
    command;
    constructor(range, command) {
        this.range = range;
        this.command = command;
    }
}
exports.CodeLens = CodeLens;
class Range {
    start;
    end;
    constructor(startLine, startChar, endLine, endChar) {
        this.start = { line: startLine, character: startChar };
        this.end = { line: endLine, character: endChar };
    }
}
exports.Range = Range;
class Position {
    line;
    character;
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}
exports.Position = Position;
//# sourceMappingURL=vscode-stub.js.map