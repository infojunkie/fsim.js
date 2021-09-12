#!/usr/bin/env node
import fs from 'fs';
import meow from 'meow';
import path from 'path';

const IGNORE_FILE = '.fsimignore';
const CACHE_FILE = '.fsimcache';
const SEPARATOR = '--';
const MIN_RATING = 0.7;

let bigrams = new Map;

// https://stackoverflow.com/a/54577682/209184
function isMochaRunning(context) {
  return ['afterEach','after','beforeEach','before','describe','it'].every(function(functionName) {
    return context[functionName] instanceof Function;
  });
}

if (!isMochaRunning(global)) {
  const OPTIONS = meow(`
    Usage: ${path.basename(process.argv[1])} /path/to/files

    Options:
      -i, --ignore              ignore file (default: ${IGNORE_FILE})
      -m, --minimum             minimum similarity rating between 0.0 and 1.0 (default: ${MIN_RATING})
      -s, --separator           separator between similar sets (default: ${SEPARATOR})
      -c, --cache               use a per-directory cache of bigrams (default: no cache)
      -h, --help                show usage information
      -v, --version             show version information
    `, {
      flags: {
        ignore: {
          type: 'string',
          alias: 'i',
          default: IGNORE_FILE
        },
        minimum: {
          type: 'number',
          alias: 'm',
          default: MIN_RATING
        },
        separator: {
          type: 'string',
          alias: 's',
          default: SEPARATOR
        },
        cache: {
          type: 'boolean',
          alias: 'c',
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
    }
  );

  if (OPTIONS.flags['help'] || !OPTIONS.input.length) {
    OPTIONS.showHelp();
  }

  const results = fsim({
    dir: OPTIONS.input[0],
    ignoreFile: OPTIONS.flags['ignore'],
    minRating: OPTIONS.flags['minimum'],
    separator: OPTIONS.flags['separator'],
    cache: OPTIONS.flags['cache']
  });
  results.forEach(result => {
    result.forEach(file => { console.log(file); });
    console.log(OPTIONS.flags['separator']);
  });
}

// https://stackoverflow.com/a/56150320/209184
function replacerMap(key, value) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}
function reviverMap(key, value) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

export function fsim(options) {
  const fileCache = options.dir + path.sep + CACHE_FILE;
  if (options.cache && fs.existsSync(fileCache)) {
    try {
      bigrams = new Map(JSON.parse(fs.readFileSync(fileCache, { encoding: 'utf8', flag: 'r' }), reviverMap));
    }
    catch (e) {
      console.warn(`Failed to read cache file ${fileCache}: ${e.message}`);
    }
  }

  const ignores = readIgnores(options.ignoreFile, options.separator);
  const files = fs.readdirSync(options.dir);
  const results = [];
  let file;
  while (file = files.shift()) {
    const matches = findSimilar(file, files, options.minRating, ignores);
    if (matches.length) {
      results.push(Array(file).concat(matches.map(match => match.file)));
    }
  }

  if (options.cache) {
    try {
      fs.writeFileSync(fileCache, JSON.stringify(bigrams, replacerMap), { encoding: 'utf8', flag: 'w' });
    }
    catch (e) {
      console.warn(`Failed to write cache file ${fileCache}: ${e.message}`);
    }
  }

  return results;
}

function stripExtension(file) {
  const dot = file.lastIndexOf('.');
  if (dot > -1 && file.length - dot < 10) {
    return file.slice(0, dot);
  }
  return file;
}

function findSimilar(file, files, minRating, ignores) {
  const ignore = (ignores && ignores.get(file)) ?? [];
  // Calculate distance between filenames after removing file extension.
  return files.map(f => { return { file: f, rating: diceMemo(stripExtension(file), stripExtension(f)) }})
  .filter(r => r.rating > minRating && !ignore.includes(r.file))
  .map(r => {
    // Remove the matches files from the set before recursing on them.
    files.splice(files.indexOf(r.file), 1);
    return r;
  })
  .reduce((matches, r) => {
    matches.push(r);
    return matches.concat(findSimilar(r.file, files, minRating, ignores));
  }, []);
}

function readIgnores(ignoreFile, separator) {
  try {
    return fs.readFileSync(ignoreFile, { encoding: 'utf8', flag: 'r' }).split(/[\n\r]/).reduce((state, line) => {
      const clean = line.trim();
      if (clean === separator) {
        state.current.forEach(k => {
          state.ignores.set(k, state.current);
        });
        state.current = [];
      } else if (clean.length) {
        state.current.push(clean);
        // FIXME if this is the very last line, add this last set.
      }
      return state;
    }, { ignores: new Map(), current: [] }).ignores;
  }
  catch (e) {
    return new Map();
  }
}

// Adaptation of
// https://github.com/ka-weihe/fast-dice-coefficient/blob/master/dice.js
// with memoization

function getBigrams(str) {
  const map = bigrams.get(str) || new Map;
  if (!map.size) {
    let i, j, ref, sub;
    for (i = j = 0, ref = str.length - 2; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
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
  const map1 = getBigrams(fst);
  const map2 = getBigrams(snd);
  let match = 0;
  map1.forEach((v, k) => {
    match += Math.min(v, map2.get(k) || 0);
  });
  return 2.0 * match / (fst.length + snd.length - 2);
}
