const assert = require('assert');
const sinon = require('sinon');
const fs = require('fs');
const fsim = require('../src/fsim').fsim;

describe('fsim', function() {
  it('Finds similarly-named files', () => {
    const results = fsim({
      dir: './test/data/files',
      ignoreFile: null,
      minRating: 0.7,
      separator: '--'
    });
    assert.deepStrictEqual(results, [
      [
        'TCP-IP Illustrated, Volume 1: The Protocols - W. Richard Stevens.txt',
        'TCP-IP Illustrated, Volume 2: The Implementation - W. Richard Stevens.pdf'
      ], [
        'The Art of Computer Programming, Vol. 1: Fundamental Algorithms - Donald E. Knuth.txt',
        'The Art of Computer Programming, Vol. 2: Seminumerical Algorithms - Donald E. Knuth.epub'
      ]
    ]);
  });

  it('Ignores specified files', () => {
    const results = fsim({
      dir: './test/data/files',
      ignoreFile: './test/data/ignore',
      minRating: 0.7,
      separator: '--'
    });
    assert.deepStrictEqual(results, [
      [
        'The Art of Computer Programming, Vol. 1: Fundamental Algorithms - Donald E. Knuth.txt',
        'The Art of Computer Programming, Vol. 2: Seminumerical Algorithms - Donald E. Knuth.epub'
      ]
    ]);
  });

  it('Works with caching', () => {
    const results = fsim({
      dir: './test/data/files',
      ignoreFile: null,
      minRating: 0.7,
      separator: '--',
      cache: true,
    });
    const cacheFile = './test/data/files/.fsimcache';
    assert.ok(fs.existsSync(cacheFile));
    assert.doesNotThrow(() => { JSON.parse(fs.readFileSync(cacheFile, { encoding: 'utf-8' })); });
    fs.unlinkSync(cacheFile);
  });
});
