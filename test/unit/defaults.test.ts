import * as assert from 'assert';
import { DEFAULT_SETTINGS, DockerDefaults } from '../../src/config/defaults';

describe('DEFAULT_SETTINGS', () => {
  it('has correct default network mode', () => {
    assert.strictEqual(DEFAULT_SETTINGS.networkMode, 'host');
  });

  it('has runAsUser enabled by default', () => {
    assert.strictEqual(DEFAULT_SETTINGS.runAsUser, true);
  });

  it('has default volume mount with {workspaceFolder} placeholder', () => {
    assert.strictEqual(DEFAULT_SETTINGS.volumes.length, 1);
    assert.strictEqual(DEFAULT_SETTINGS.volumes[0], '{workspaceFolder}:/workspace');
  });

  it('has correct default working directory', () => {
    assert.strictEqual(DEFAULT_SETTINGS.workingDir, '/workspace');
  });

  it('has empty default ports', () => {
    assert.deepStrictEqual(DEFAULT_SETTINGS.ports, []);
  });

  it('implements DockerDefaults interface', () => {
    // Verify all required fields exist
    const settings: DockerDefaults = DEFAULT_SETTINGS;
    assert.ok('networkMode' in settings);
    assert.ok('runAsUser' in settings);
    assert.ok('volumes' in settings);
    assert.ok('workingDir' in settings);
    assert.ok('ports' in settings);
  });
});
