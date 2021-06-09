const assert = require('assert');
const sinon = require('sinon');
const fs = require('fs');
const fsim = require('../src/fsim');
const progress = require('progress');

describe('fsim', function() {
  let output;
  beforeEach(() => {
    output = '';
    sinon.stub(progress.prototype, 'interrupt').callsFake((o) => { output += o + '\n'; });
    sinon.stub(progress.prototype, 'render');
  });
  afterEach(() => {
    progress.prototype.interrupt.restore();
    progress.prototype.render.restore();
  });

  it('Finds similarly-named files', () => {
    fsim.main({
      dir: './test/data/files',
      ignoreFile: null,
      minRating: 0.7,
      separator: '--',
    });
    assert.deepStrictEqual(output,
      'TCP-IP Illustrated, Volume 1: The Protocols - W. Richard Stevens\n' +
      'TCP-IP Illustrated, Volume 2: The Implementation - W. Richard Stevens\n' +
      '--\n' +
      'The Art of Computer Programming, Vol. 1: Fundamental Algorithms - Donald E. Knuth\n' +
      'The Art of Computer Programming, Vol. 2: Seminumerical Algorithms - Donald E. Knuth\n' +
      '--\n'
    );
  });

  it('Ignores specified files', () => {
    fsim.main({
      dir: './test/data/files',
      ignoreFile: './test/data/ignore',
      minRating: 0.7,
      separator: '--',
    });
    assert.deepStrictEqual(output,
      'The Art of Computer Programming, Vol. 1: Fundamental Algorithms - Donald E. Knuth\n' +
      'The Art of Computer Programming, Vol. 2: Seminumerical Algorithms - Donald E. Knuth\n' +
      '--\n'
    );
  });
});
