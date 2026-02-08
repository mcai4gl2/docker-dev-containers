import * as assert from 'assert';
import {
  logHeader,
  logBuildStart,
  logExecStart,
  logResult,
  logTimestamped,
} from '../../src/views/outputPanel';

/** Minimal mock for vscode.OutputChannel */
class MockOutputChannel {
  lines: string[] = [];

  appendLine(line: string): void {
    this.lines.push(line);
  }

  clear(): void {
    this.lines = [];
  }
}

describe('outputPanel', () => {
  let channel: MockOutputChannel;

  beforeEach(() => {
    channel = new MockOutputChannel();
  });

  describe('logHeader', () => {
    it('outputs a separator and title', () => {
      logHeader(channel as any, 'Test Header');
      assert.ok(channel.lines.length >= 3);
      assert.ok(channel.lines[1].includes('─'));
      assert.ok(channel.lines[2].includes('Test Header'));
    });
  });

  describe('logBuildStart', () => {
    it('logs image name, tag, and build directory', () => {
      logBuildStart(channel as any, 'grpc-tools', 'proj-grpc-tools:latest', '/path/to/docker/grpc-tools');
      const output = channel.lines.join('\n');
      assert.ok(output.includes('Building grpc-tools'));
      assert.ok(output.includes('proj-grpc-tools:latest'));
      assert.ok(output.includes('/path/to/docker/grpc-tools'));
    });
  });

  describe('logExecStart', () => {
    it('logs image name and command', () => {
      logExecStart(channel as any, 'grpc-tools', 'grpcurl list', false);
      const output = channel.lines.join('\n');
      assert.ok(output.includes('Executing in grpc-tools'));
      assert.ok(output.includes('grpcurl list'));
    });

    it('indicates devcontainer when active', () => {
      logExecStart(channel as any, 'grpc-tools', 'grpcurl list', true);
      const output = channel.lines.join('\n');
      assert.ok(output.includes('Devcontainer'));
    });

    it('does not mention devcontainer when inactive', () => {
      logExecStart(channel as any, 'grpc-tools', 'grpcurl list', false);
      const output = channel.lines.join('\n');
      assert.ok(!output.includes('Devcontainer'));
    });
  });

  describe('logResult', () => {
    it('logs [OK] for success', () => {
      logResult(channel as any, true, 'Build completed');
      assert.ok(channel.lines.some(l => l.includes('[OK]')));
      assert.ok(channel.lines.some(l => l.includes('Build completed')));
    });

    it('logs [FAIL] for failure', () => {
      logResult(channel as any, false, 'Build failed');
      assert.ok(channel.lines.some(l => l.includes('[FAIL]')));
      assert.ok(channel.lines.some(l => l.includes('Build failed')));
    });
  });

  describe('logTimestamped', () => {
    it('includes a timestamp in HH:MM:SS format', () => {
      logTimestamped(channel as any, 'test message');
      assert.ok(channel.lines.length === 1);
      assert.match(channel.lines[0], /\[\d{2}:\d{2}:\d{2}\] test message/);
    });
  });
});
