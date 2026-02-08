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
const outputPanel_1 = require("../../src/views/outputPanel");
/** Minimal mock for vscode.OutputChannel */
class MockOutputChannel {
    lines = [];
    appendLine(line) {
        this.lines.push(line);
    }
    clear() {
        this.lines = [];
    }
}
describe('outputPanel', () => {
    let channel;
    beforeEach(() => {
        channel = new MockOutputChannel();
    });
    describe('logHeader', () => {
        it('outputs a separator and title', () => {
            (0, outputPanel_1.logHeader)(channel, 'Test Header');
            assert.ok(channel.lines.length >= 3);
            assert.ok(channel.lines[1].includes('─'));
            assert.ok(channel.lines[2].includes('Test Header'));
        });
    });
    describe('logBuildStart', () => {
        it('logs image name, tag, and build directory', () => {
            (0, outputPanel_1.logBuildStart)(channel, 'grpc-tools', 'proj-grpc-tools:latest', '/path/to/docker/grpc-tools');
            const output = channel.lines.join('\n');
            assert.ok(output.includes('Building grpc-tools'));
            assert.ok(output.includes('proj-grpc-tools:latest'));
            assert.ok(output.includes('/path/to/docker/grpc-tools'));
        });
    });
    describe('logExecStart', () => {
        it('logs image name and command', () => {
            (0, outputPanel_1.logExecStart)(channel, 'grpc-tools', 'grpcurl list', false);
            const output = channel.lines.join('\n');
            assert.ok(output.includes('Executing in grpc-tools'));
            assert.ok(output.includes('grpcurl list'));
        });
        it('indicates devcontainer when active', () => {
            (0, outputPanel_1.logExecStart)(channel, 'grpc-tools', 'grpcurl list', true);
            const output = channel.lines.join('\n');
            assert.ok(output.includes('Devcontainer'));
        });
        it('does not mention devcontainer when inactive', () => {
            (0, outputPanel_1.logExecStart)(channel, 'grpc-tools', 'grpcurl list', false);
            const output = channel.lines.join('\n');
            assert.ok(!output.includes('Devcontainer'));
        });
    });
    describe('logResult', () => {
        it('logs [OK] for success', () => {
            (0, outputPanel_1.logResult)(channel, true, 'Build completed');
            assert.ok(channel.lines.some(l => l.includes('[OK]')));
            assert.ok(channel.lines.some(l => l.includes('Build completed')));
        });
        it('logs [FAIL] for failure', () => {
            (0, outputPanel_1.logResult)(channel, false, 'Build failed');
            assert.ok(channel.lines.some(l => l.includes('[FAIL]')));
            assert.ok(channel.lines.some(l => l.includes('Build failed')));
        });
    });
    describe('logTimestamped', () => {
        it('includes a timestamp in HH:MM:SS format', () => {
            (0, outputPanel_1.logTimestamped)(channel, 'test message');
            assert.ok(channel.lines.length === 1);
            assert.match(channel.lines[0], /\[\d{2}:\d{2}:\d{2}\] test message/);
        });
    });
});
//# sourceMappingURL=outputPanel.test.js.map