const assert = require('assert');
const sinon = require('sinon');
const fs = require('fs');
const fsim = require('../src/fsim').fsim;

describe('fsim', function() {
  afterEach(() => {
    sinon.restore();
  });

  it('Finds similarly-named files', () => {
    const ignoreFile = 'test/data/files/.fsimignore';
    sinon.stub(fs, 'existsSync').withArgs(ignoreFile).returns(false);
    fs.existsSync.callThrough(); // call original if not passing ignoreFile argument
    const results = fsim({
      dir: './test/data/files',
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
      minRating: 0.7,
      separator: '--',
      cache: true,
    });
    const cacheFile = './test/data/files/.fsimcache';
    assert.ok(fs.existsSync(cacheFile));
    assert.doesNotThrow(() => { JSON.parse(fs.readFileSync(cacheFile, { encoding: 'utf-8' })); });
    fs.unlinkSync(cacheFile);
  });

  it('works recursively', () => {
    const results = fsim({
      dir: './test/data/files',
      minRating: 0.7,
      separator: '--',
      recursive: true,
    });
    assert.deepStrictEqual(results, [
      [
        'Introduction to Automata Theory, Languages, and Computation - John E. Hopcroft.txt',
        'subdir/Introduction to Automata Theory, Languages, and Computation - John E. Hopcroft.epub',
      ], [
        'The Art of Computer Programming, Vol. 1: Fundamental Algorithms - Donald E. Knuth.txt',
        'The Art of Computer Programming, Vol. 2: Seminumerical Algorithms - Donald E. Knuth.epub'
      ]
    ]);
  });
});
