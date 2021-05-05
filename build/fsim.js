#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.main = main;

var _assert = require("assert");

var _fastDiceCoefficient = _interopRequireDefault(require("fast-dice-coefficient"));

var _fs = _interopRequireDefault(require("fs"));

var _meow = _interopRequireDefault(require("meow"));

var _path = _interopRequireDefault(require("path"));

var IGNORE_FILE = '.fsimignore';
var SEPARATOR = '--';
var MIN_RATING = 0.7; // https://stackoverflow.com/a/54577682/209184

function isMochaRunning(context) {
  return ['afterEach', 'after', 'beforeEach', 'before', 'describe', 'it'].every(function (functionName) {
    return context[functionName] instanceof Function;
  });
}

if (!isMochaRunning(global)) {
  var OPTIONS = (0, _meow["default"])("\n    Usage: ".concat(_path["default"].basename(process.argv[1]), " /path/to/files\n\n    Options:\n      -i, --ignore              ignore file (").concat(IGNORE_FILE, ")\n      -m, --minimum             minimum similarity rating between 0.0 and 1.0 (").concat(MIN_RATING, ")\n      -s, --separator           separator between similar sets (").concat(SEPARATOR, ")\n      -h, --help                show usage information\n      -v, --version             show version information\n    "), {
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

  main({
    dir: OPTIONS.input[0],
    ignoreFile: OPTIONS.flags['ignore'],
    minRating: OPTIONS.flags['minimum'],
    separator: OPTIONS.flags['separator']
  });
}

function main(options) {
  var ignores = readIgnores(options.ignoreFile, options.separator);

  var files = _fs["default"].readdirSync(options.dir);

  var file;

  while (file = files.shift()) {
    var matches = findSimilar(file, files, options.minRating, ignores);

    if (matches.length) {
      console.log(file);
      matches.forEach(function (match) {
        console.log(match.file);
      });
      console.log(options.separator);
    }
  }
}

function findSimilar(file, files, minRating, ignores) {
  var _ref;

  var ignore = (_ref = ignores && ignores.get(file)) !== null && _ref !== void 0 ? _ref : [];
  return files.map(function (f) {
    return {
      file: f,
      rating: (0, _fastDiceCoefficient["default"])(file, f)
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
        state.current.push(clean);
      }

      return state;
    }, {
      ignores: new Map(),
      current: []
    }).ignores;
  } catch (e) {
    return new Map();
  }
}