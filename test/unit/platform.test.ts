import * as assert from 'assert';
import { getUidGid } from '../../src/utils/platform';

describe('getUidGid', () => {
  it('returns a string in uid:gid format', () => {
    const result = getUidGid();
    assert.match(result, /^\d+:\d+$/);
  });

  it('returns non-negative numbers', () => {
    const result = getUidGid();
    const [uid, gid] = result.split(':').map(Number);
    assert.ok(uid >= 0, `uid should be >= 0, got ${uid}`);
    assert.ok(gid >= 0, `gid should be >= 0, got ${gid}`);
  });

  if (process.platform !== 'win32') {
    it('returns actual uid:gid on Unix', () => {
      const result = getUidGid();
      const [uid, gid] = result.split(':').map(Number);
      // On Unix, process.getuid() and process.getgid() should match
      assert.strictEqual(uid, process.getuid!());
      assert.strictEqual(gid, process.getgid!());
    });
  }
});
