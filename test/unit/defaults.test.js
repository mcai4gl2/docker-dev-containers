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
const defaults_1 = require("../../src/config/defaults");
describe('DEFAULT_SETTINGS', () => {
    it('has correct default network mode', () => {
        assert.strictEqual(defaults_1.DEFAULT_SETTINGS.networkMode, 'host');
    });
    it('has runAsUser enabled by default', () => {
        assert.strictEqual(defaults_1.DEFAULT_SETTINGS.runAsUser, true);
    });
    it('has default volume mount with {workspaceFolder} placeholder', () => {
        assert.strictEqual(defaults_1.DEFAULT_SETTINGS.volumes.length, 1);
        assert.strictEqual(defaults_1.DEFAULT_SETTINGS.volumes[0], '{workspaceFolder}:/workspace');
    });
    it('has correct default working directory', () => {
        assert.strictEqual(defaults_1.DEFAULT_SETTINGS.workingDir, '/workspace');
    });
    it('has empty default ports', () => {
        assert.deepStrictEqual(defaults_1.DEFAULT_SETTINGS.ports, []);
    });
    it('implements DockerDefaults interface', () => {
        // Verify all required fields exist
        const settings = defaults_1.DEFAULT_SETTINGS;
        assert.ok('networkMode' in settings);
        assert.ok('runAsUser' in settings);
        assert.ok('volumes' in settings);
        assert.ok('workingDir' in settings);
        assert.ok('ports' in settings);
    });
});
//# sourceMappingURL=defaults.test.js.map