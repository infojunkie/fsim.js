#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fsim = fsim;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _fs = _interopRequireDefault(require("fs"));
var _meow = _interopRequireDefault(require("meow"));
var _path = _interopRequireDefault(require("path"));
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
var IGNORE_FILE = '.fsimignore';
var CACHE_FILE = '.fsimcache';
var SEPARATOR = '--';
var MIN_RATING = 0.7;
var bigrams = new Map();

// https://stackoverflow.com/a/54577682/209184
function isMochaRunning(context) {
  return ['afterEach', 'after', 'beforeEach', 'before', 'describe', 'it'].every(function (functionName) {
    return context[functionName] instanceof Function;
  });
}
if (!isMochaRunning(global)) {
  var OPTIONS = (0, _meow["default"])("\n    Usage: ".concat(_path["default"].basename(process.argv[1]), " /path/to/files\n\n    Options:\n      -r, --recursive           recurse into subdirectories (default: no recursion)\n      -m, --minimum             minimum similarity rating between 0.0 and 1.0 (default: ").concat(MIN_RATING, ")\n      -s, --separator           separator between similar sets (default: ").concat(SEPARATOR, ")\n      -c, --cache               use a per-directory cache of bigrams (default: no cache)\n      -h, --help                show usage information\n      -v, --version             show version information\n    "), {
    flags: {
      recursive: {
        type: 'boolean',
        alias: 'r'
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
    minRating: OPTIONS.flags['minimum'],
    separator: OPTIONS.flags['separator'],
    cache: OPTIONS.flags['cache'],
    recursive: OPTIONS.flags['recursive']
  });
  results.forEach(function (result) {
    result.forEach(function (file) {
      console.log(file);
    });
    console.log(OPTIONS.flags['separator']);
  });
}

// https://stackoverflow.com/a/56150320/209184
function replacerMap(key, value) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: (0, _toConsumableArray2["default"])(value)
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
  var fileCache = _path["default"].join(options.dir, CACHE_FILE);
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
  var ignores = readIgnores(_path["default"].join(options.dir, IGNORE_FILE), options.separator);
  var results = [];
  var files = getFiles(options.dir, options.recursive, _path["default"].normalize(options.dir + _path["default"].sep));
  files.forEach(function (file) {
    files["delete"](file.filepath);
    var matches = findSimilar(file, files, options.minRating, ignores);
    if (matches.length) {
      results.push(Array(file.filepath).concat(matches.map(function (match) {
        return match.filepath;
      })));
    }
  });
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
function findSimilar(ref, files, minRating, ignores) {
  var _ref;
  var ignore = (_ref = ignores && ignores.get(ref.filepath)) !== null && _ref !== void 0 ? _ref : [];

  // Find similar files to the reference:
  return Array.from(files.values())
  // 1. Filter out ignored files
  .filter(function (file) {
    return !ignore.includes(file.filepath);
  })
  // 2. Calculate distance between reference and candidate
  .map(function (file) {
    return _objectSpread(_objectSpread({}, file), {}, {
      rating: dice(ref.filename, file.filename)
    });
  })
  // 3. filter out results < threshold
  .filter(function (file) {
    return file.rating > minRating;
  })
  // 4. Remove results from active set before recursing.
  .map(function (file) {
    files["delete"](file.filepath);
    return file;
  })
  // 5. Recurse on each result to aggregate similars.
  .reduce(function (matches, file) {
    matches.push(file);
    return matches.concat(findSimilar(file, files, minRating, ignores));
  }, []);
}
function readIgnores(ignoreFile, separator) {
  if (!_fs["default"].existsSync(ignoreFile)) return new Map();
  try {
    return _fs["default"].readFileSync(ignoreFile, {
      encoding: 'utf8',
      flag: 'r'
    }).split(/[\n\r]/).reduce(function (state, line, index, lines) {
      var clean = line.trim();
      if (clean === separator) {
        state.current.forEach(function (k) {
          state.ignores.set(k, state.current);
        });
        state.current = [];
      } else if (clean.length) {
        state.current.push(clean);
      }
      return state;
    }, {
      ignores: new Map(),
      current: []
    }).ignores;
  } catch (e) {
    console.warn("Failed to read ignore file ".concat(ignoreFile, ": ").concat(e.message));
    return new Map();
  }
}
function getFiles(dir, recursive, prefix) {
  return _fs["default"].readdirSync(dir).reduce(function (files, file) {
    var filepath = _path["default"].join(dir, file);
    if (_fs["default"].statSync(filepath).isDirectory()) {
      if (recursive) {
        return new Map([].concat((0, _toConsumableArray2["default"])(files), (0, _toConsumableArray2["default"])(getFiles(filepath, recursive, prefix))));
      }
    } else {
      var relpath = filepath.replace(prefix, '');
      files.set(relpath, {
        filepath: relpath,
        filename: stripExtension(file)
      });
    }
    return files;
  }, new Map());
}

// Implementation of Dice coefficient with memoization of bigrams
// https://en.wikipedia.org/wiki/S%C3%B8rensen%E2%80%93Dice_coefficient
// Adapted from https://github.com/ka-weihe/fast-dice-coefficient
function getBigrams(str) {
  var map = bigrams.get(str) || new Map();
  if (!map.size) {
    var i, j, ref;
    for (i = j = 0, ref = str.length - 2; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
      var bi = str.substr(i, 2);
      var repeats = 1 + (map.get(bi) || 0);
      map.set(bi, repeats);
    }
    bigrams.set(str, map);
  }
  return map;
}
function dice(fst, snd) {
  if (fst.length < 2 || snd.length < 2) {
    return 0;
  }
  var map1 = getBigrams(fst);
  var map2 = getBigrams(snd);
  var match = 0;
  if (map1.length > map2.length) {
    map2.forEach(function (v, k) {
      if (map1.has(k)) {
        match += Math.min(v, map1.get(k));
      }
    });
  } else {
    map1.forEach(function (v, k) {
      if (map2.has(k)) {
        match += Math.min(v, map2.get(k));
      }
    });
  }
  return 2.0 * match / (fst.length + snd.length - 2);
}