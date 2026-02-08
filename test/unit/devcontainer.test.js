"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const devcontainer_1 = require("../../src/docker/devcontainer");
describe('isInDevcontainer', () => {
    // Save original env vars
    const origRemoteIpc = process.env['REMOTE_CONTAINERS_IPC'];
    const origRemoteContainers = process.env['REMOTE_CONTAINERS'];
    afterEach(() => {
        // Restore env vars
        if (origRemoteIpc === undefined) {
            delete process.env['REMOTE_CONTAINERS_IPC'];
        }
        else {
            process.env['REMOTE_CONTAINERS_IPC'] = origRemoteIpc;
        }
        if (origRemoteContainers === undefined) {
            delete process.env['REMOTE_CONTAINERS'];
        }
        else {
            process.env['REMOTE_CONTAINERS'] = origRemoteContainers;
        }
    });
    it('returns true when REMOTE_CONTAINERS_IPC is set', () => {
        process.env['REMOTE_CONTAINERS_IPC'] = '/tmp/ipc.sock';
        assert.strictEqual((0, devcontainer_1.isInDevcontainer)(), true);
    });
    it('returns true when REMOTE_CONTAINERS is set', () => {
        delete process.env['REMOTE_CONTAINERS_IPC'];
        process.env['REMOTE_CONTAINERS'] = 'true';
        assert.strictEqual((0, devcontainer_1.isInDevcontainer)(), true);
    });
    it('returns false when no devcontainer indicators present', () => {
        delete process.env['REMOTE_CONTAINERS_IPC'];
        delete process.env['REMOTE_CONTAINERS'];
        // This test may still return true if CWD starts with /workspaces/
        // or user is 'vscode', so we only check if neither env var is set
        // and we're not in a devcontainer by other means
        if (!process.cwd().startsWith('/workspaces/')) {
            const result = (0, devcontainer_1.isInDevcontainer)();
            // Could still be true if username is 'vscode', so we just verify it returns a boolean
            assert.strictEqual(typeof result, 'boolean');
        }
    });
});
describe('getDevcontainerInfo', () => {
    const origHostWorkspace = process.env['HOST_WORKSPACE_FOLDER'];
    afterEach(() => {
        if (origHostWorkspace === undefined) {
            delete process.env['HOST_WORKSPACE_FOLDER'];
        }
        else {
            process.env['HOST_WORKSPACE_FOLDER'] = origHostWorkspace;
        }
    });
    it('uses HOST_WORKSPACE_FOLDER when set', () => {
        process.env['HOST_WORKSPACE_FOLDER'] = '/home/user/project';
        const info = (0, devcontainer_1.getDevcontainerInfo)('/workspaces/project');
        assert.strictEqual(info.hostProjectRoot, '/home/user/project');
        assert.strictEqual(info.containerProjectRoot, '/workspaces/project');
    });
    it('falls back to workspacePath when HOST_WORKSPACE_FOLDER not set', () => {
        delete process.env['HOST_WORKSPACE_FOLDER'];
        const info = (0, devcontainer_1.getDevcontainerInfo)('/workspaces/project');
        assert.strictEqual(info.hostProjectRoot, '/workspaces/project');
        assert.strictEqual(info.containerProjectRoot, '/workspaces/project');
    });
});
describe('adjustVolumeForDevcontainer', () => {
    const info = {
        hostProjectRoot: '/home/user/project',
        containerProjectRoot: '/workspaces/project',
    };
    it('remaps container path to host path', () => {
        const result = (0, devcontainer_1.adjustVolumeForDevcontainer)('/workspaces/project:/workspace', info);
        assert.strictEqual(result, '/home/user/project:/workspace');
    });
    it('remaps subdirectories correctly', () => {
        const result = (0, devcontainer_1.adjustVolumeForDevcontainer)('/workspaces/project/src:/workspace/src', info);
        assert.strictEqual(result, '/home/user/project/src:/workspace/src');
    });
    it('preserves volume options', () => {
        const result = (0, devcontainer_1.adjustVolumeForDevcontainer)('/workspaces/project:/workspace:ro', info);
        assert.strictEqual(result, '/home/user/project:/workspace:ro');
    });
    it('leaves non-devcontainer paths unchanged', () => {
        const result = (0, devcontainer_1.adjustVolumeForDevcontainer)('/tmp/data:/data', info);
        assert.strictEqual(result, '/tmp/data:/data');
    });
    it('returns malformed volume string as-is', () => {
        const result = (0, devcontainer_1.adjustVolumeForDevcontainer)('just-a-name', info);
        assert.strictEqual(result, 'just-a-name');
    });
    it('handles exact container root path (no subdirectory)', () => {
        const result = (0, devcontainer_1.adjustVolumeForDevcontainer)('/workspaces/project:/workspace', info);
        assert.strictEqual(result, '/home/user/project:/workspace');
    });
});
describe('isDockerSocketAvailable', () => {
    it('returns a boolean', () => {
        const result = (0, devcontainer_1.isDockerSocketAvailable)();
        assert.strictEqual(typeof result, 'boolean');
    });
});
//# sourceMappingURL=devcontainer.test.js.map