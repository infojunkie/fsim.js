#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fsim = fsim;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _fs = _interopRequireDefault(require("fs"));

var _meow = _interopRequireDefault(require("meow"));

var _path = _interopRequireDefault(require("path"));

var IGNORE_FILE = '.fsimignore';
var CACHE_FILE = '.fsimcache';
var SEPARATOR = '--';
var MIN_RATING = 0.7;
var bigrams = new Map(); // https://stackoverflow.com/a/54577682/209184

function isMochaRunning(context) {
  return ['afterEach', 'after', 'beforeEach', 'before', 'describe', 'it'].every(function (functionName) {
    return context[functionName] instanceof Function;
  });
}

if (!isMochaRunning(global)) {
  var OPTIONS = (0, _meow["default"])("\n    Usage: ".concat(_path["default"].basename(process.argv[1]), " /path/to/files\n\n    Options:\n      -i, --ignore              ignore file (default: ").concat(IGNORE_FILE, ")\n      -m, --minimum             minimum similarity rating between 0.0 and 1.0 (default: ").concat(MIN_RATING, ")\n      -s, --separator           separator between similar sets (default: ").concat(SEPARATOR, ")\n      -c, --cache               use a per-directory cache of bigrams (default: no cache)\n      -h, --help                show usage information\n      -v, --version             show version information\n    "), {
    flags: {
      ignore: {
        type: 'string',
        alias: 'i',
        "default": IGNORE_FILE
      },
      minimum: {
        type: 'number',
        alias: 'm',
        "default": MIN_RATING
      },
      separator: {
        type: 'string',
        alias: 's',
        "default": SEPARATOR
      },
      cache: {
        type: 'boolean',
        alias: 'c'
      },
      help: {
        type: 'boolean',
        alias: 'h'
      },
      version: {
        type: 'boolean',
        alias: 'v'
      }
    }
  });

  if (OPTIONS.flags['help'] || !OPTIONS.input.length) {
    OPTIONS.showHelp();
  }

  var results = fsim({
    dir: OPTIONS.input[0],
    ignoreFile: OPTIONS.flags['ignore'],
    minRating: OPTIONS.flags['minimum'],
    separator: OPTIONS.flags['separator'],
    cache: OPTIONS.flags['cache']
  });
  results.forEach(function (result) {
    result.forEach(function (file) {
      console.log(file);
    });
    console.log(OPTIONS.flags['separator']);
  });
} // https://stackoverflow.com/a/56150320/209184


function replacerMap(key, value) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()) // or with spread: value: [...value]

    };
  } else {
    return value;
  }
}

function reviverMap(key, value) {
  if ((0, _typeof2["default"])(value) === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }

  return value;
}

function fsim(options) {
  var fileCache = options.dir + _path["default"].sep + CACHE_FILE;

  if (options.cache && _fs["default"].existsSync(fileCache)) {
    try {
      bigrams = new Map(JSON.parse(_fs["default"].readFileSync(fileCache, {
        encoding: 'utf8',
        flag: 'r'
      }), reviverMap));
    } catch (e) {
      console.warn("Failed to read cache file ".concat(fileCache, ": ").concat(e.message));
    }
  }

  var ignores = readIgnores(options.ignoreFile, options.separator);

  var files = _fs["default"].readdirSync(options.dir);

  var results = [];
  var file;

  while (file = files.shift()) {
    var matches = findSimilar(file, files, options.minRating, ignores);

    if (matches.length) {
      results.push(Array(file).concat(matches.map(function (match) {
        return match.file;
      })));
    }
  }

  if (options.cache) {
    try {
      _fs["default"].writeFileSync(fileCache, JSON.stringify(bigrams, replacerMap), {
        encoding: 'utf8',
        flag: 'w'
      });
    } catch (e) {
      console.warn("Failed to write cache file ".concat(fileCache, ": ").concat(e.message));
    }
  }

  return results;
}

function stripExtension(file) {
  var dot = file.lastIndexOf('.');

  if (dot > -1 && file.length - dot < 10) {
    return file.slice(0, dot);
  }

  return file;
}

function findSimilar(file, files, minRating, ignores) {
  var _ref;

  var ignore = (_ref = ignores && ignores.get(file)) !== null && _ref !== void 0 ? _ref : []; // Calculate distance between filenames after removing file extension.

  return files.map(function (f) {
    return {
      file: f,
      rating: diceMemo(stripExtension(file), stripExtension(f))
    };
  }).filter(function (r) {
    return r.rating > minRating && !ignore.includes(r.file);
  }).map(function (r) {
    // Remove the matches files from the set before recursing on them.
    files.splice(files.indexOf(r.file), 1);
    return r;
  }).reduce(function (matches, r) {
    matches.push(r);
    return matches.concat(findSimilar(r.file, files, minRating, ignores));
  }, []);
}

function readIgnores(ignoreFile, separator) {
  try {
    return _fs["default"].readFileSync(ignoreFile, {
      encoding: 'utf8',
      flag: 'r'
    }).split(/[\n\r]/).reduce(function (state, line) {
      var clean = line.trim();

      if (clean === separator) {
        state.current.forEach(function (k) {
          state.ignores.set(k, state.current);
        });
        state.current = [];
      } else if (clean.length) {
        state.current.push(clean); // FIXME if this is the very last line, add this last set.
      }

      return state;
    }, {
      ignores: new Map(),
      current: []
    }).ignores;
  } catch (e) {
    return new Map();
  }
} // Adaptation of
// https://github.com/ka-weihe/fast-dice-coefficient/blob/master/dice.js
// with memoization


function getBigrams(str) {
  var map = bigrams.get(str) || new Map();

  if (!map.size) {
    var i, j, ref, sub;

    for (i = j = 0, ref = str.length - 2; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
      sub = str.substr(i, 2);

      if (map.has(sub)) {
        map.set(sub, map.get(sub) + 1);
      } else {
        map.set(sub, 1);
      }
    }

    bigrams.set(str, map);
  }

  return map;
}

function diceMemo(fst, snd) {
  if (fst.length < 2 || snd.length < 2) {
    return 0;
  }

  var map1 = getBigrams(fst);
  var map2 = getBigrams(snd);
  var match = 0;
  map1.forEach(function (v, k) {
    match += Math.min(v, map2.get(k) || 0);
  });
  return 2.0 * match / (fst.length + snd.length - 2);
}