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
const placeholder_1 = require("../../src/utils/placeholder");
describe('resolvePlaceholders', () => {
    const ctx = { workspaceFolder: '/home/user/project' };
    describe('{workspaceFolder} placeholder', () => {
        it('resolves {workspaceFolder} to workspace path', () => {
            const result = (0, placeholder_1.resolvePlaceholders)('{workspaceFolder}:/workspace', ctx);
            assert.strictEqual(result, '/home/user/project:/workspace');
        });
        it('resolves multiple {workspaceFolder} occurrences', () => {
            const result = (0, placeholder_1.resolvePlaceholders)('{workspaceFolder}/src:{workspaceFolder}/dest', ctx);
            assert.strictEqual(result, '/home/user/project/src:/home/user/project/dest');
        });
    });
    describe('{project_root} placeholder', () => {
        it('resolves {project_root} to workspace path (backward compat)', () => {
            const result = (0, placeholder_1.resolvePlaceholders)('{project_root}:/workspace', ctx);
            assert.strictEqual(result, '/home/user/project:/workspace');
        });
    });
    describe('${VAR} environment variable placeholder', () => {
        it('resolves ${VAR} from environment', () => {
            const origVal = process.env['HOME'];
            process.env['TEST_PLACEHOLDER_VAR'] = '/custom/path';
            try {
                const result = (0, placeholder_1.resolvePlaceholders)('${TEST_PLACEHOLDER_VAR}/data', ctx);
                assert.strictEqual(result, '/custom/path/data');
            }
            finally {
                delete process.env['TEST_PLACEHOLDER_VAR'];
            }
        });
        it('resolves missing env var to empty string', () => {
            delete process.env['NONEXISTENT_TEST_VAR_12345'];
            const result = (0, placeholder_1.resolvePlaceholders)('prefix-${NONEXISTENT_TEST_VAR_12345}-suffix', ctx);
            assert.strictEqual(result, 'prefix--suffix');
        });
        it('resolves multiple env vars', () => {
            process.env['TEST_A'] = 'alpha';
            process.env['TEST_B'] = 'beta';
            try {
                const result = (0, placeholder_1.resolvePlaceholders)('${TEST_A}-${TEST_B}', ctx);
                assert.strictEqual(result, 'alpha-beta');
            }
            finally {
                delete process.env['TEST_A'];
                delete process.env['TEST_B'];
            }
        });
    });
    describe('mixed placeholders', () => {
        it('resolves all placeholder types in one string', () => {
            process.env['TEST_MIX_VAR'] = 'mixed';
            try {
                const result = (0, placeholder_1.resolvePlaceholders)('{workspaceFolder}/${TEST_MIX_VAR}', ctx);
                assert.strictEqual(result, '/home/user/project/mixed');
            }
            finally {
                delete process.env['TEST_MIX_VAR'];
            }
        });
    });
    describe('no placeholders', () => {
        it('returns string unchanged if no placeholders', () => {
            const result = (0, placeholder_1.resolvePlaceholders)('/usr/local/bin', ctx);
            assert.strictEqual(result, '/usr/local/bin');
        });
        it('handles empty string', () => {
            const result = (0, placeholder_1.resolvePlaceholders)('', ctx);
            assert.strictEqual(result, '');
        });
    });
});
describe('resolveVolumePlaceholders', () => {
    const ctx = { workspaceFolder: '/home/user/project' };
    it('resolves placeholders in a list of volumes', () => {
        const volumes = [
            '{workspaceFolder}:/workspace',
            '{project_root}/data:/data',
        ];
        const resolved = (0, placeholder_1.resolveVolumePlaceholders)(volumes, ctx);
        assert.deepStrictEqual(resolved, [
            '/home/user/project:/workspace',
            '/home/user/project/data:/data',
        ]);
    });
    it('returns empty array for empty input', () => {
        const resolved = (0, placeholder_1.resolveVolumePlaceholders)([], ctx);
        assert.deepStrictEqual(resolved, []);
    });
    it('leaves volumes without placeholders unchanged', () => {
        const volumes = ['/tmp:/tmp', '/var/run/docker.sock:/var/run/docker.sock'];
        const resolved = (0, placeholder_1.resolveVolumePlaceholders)(volumes, ctx);
        assert.deepStrictEqual(resolved, volumes);
    });
});
//# sourceMappingURL=placeholder.test.js.map