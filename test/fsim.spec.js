const assert = require('assert');
const fs = require('fs');
const fsim = require('../src/fsim');
const stdout = require('test-console').stdout;

describe('fsim', function() {
  it('Finds similarly-named files', () => {
    const output = stdout.inspectSync(() => {
      fsim.main({
        dir: './test/data/files',
        ignoreFile: null,
        minRating: 0.7,
        separator: '--',
      });
    });
    assert.deepStrictEqual(output, [
      'TCP-IP Illustrated, Volume 1: The Protocols - W. Richard Stevens\n',
      'TCP-IP Illustrated, Volume 2: The Implementation - W. Richard Stevens\n',
      '--\n',
      'The Art of Computer Programming, Vol. 1: Fundamental Algorithms - Donald E. Knuth\n',
      'The Art of Computer Programming, Vol. 2: Seminumerical Algorithms - Donald E. Knuth\n',
      '--\n'
    ]);
  });

  it('Ignores specified files', () => {
    const output = stdout.inspectSync(() => {
      fsim.main({
        dir: './test/data/files',
        ignoreFile: './test/data/ignore',
        minRating: 0.7,
        separator: '--',
      });
    });
    assert.deepStrictEqual(output, [
      'The Art of Computer Programming, Vol. 1: Fundamental Algorithms - Donald E. Knuth\n',
      'The Art of Computer Programming, Vol. 2: Seminumerical Algorithms - Donald E. Knuth\n',
      '--\n'
    ]);
  });
});
