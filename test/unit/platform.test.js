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
const platform_1 = require("../../src/utils/platform");
describe('getUidGid', () => {
    it('returns a string in uid:gid format', () => {
        const result = (0, platform_1.getUidGid)();
        assert.match(result, /^\d+:\d+$/);
    });
    it('returns non-negative numbers', () => {
        const result = (0, platform_1.getUidGid)();
        const [uid, gid] = result.split(':').map(Number);
        assert.ok(uid >= 0, `uid should be >= 0, got ${uid}`);
        assert.ok(gid >= 0, `gid should be >= 0, got ${gid}`);
    });
    if (process.platform !== 'win32') {
        it('returns actual uid:gid on Unix', () => {
            const result = (0, platform_1.getUidGid)();
            const [uid, gid] = result.split(':').map(Number);
            // On Unix, process.getuid() and process.getgid() should match
            assert.strictEqual(uid, process.getuid());
            assert.strictEqual(gid, process.getgid());
        });
    }
});
//# sourceMappingURL=platform.test.js.map