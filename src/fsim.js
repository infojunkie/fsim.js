#!/usr/bin/env node
import dice from 'fast-dice-coefficient';
import fs from 'fs';
import meow from 'meow';
import path from 'path';
import progress from 'progress';

const IGNORE_FILE = '.fsimignore';
const SEPARATOR = '--';
const MIN_RATING = 0.7;

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
      -i, --ignore              ignore file (${IGNORE_FILE})
      -m, --minimum             minimum similarity rating between 0.0 and 1.0 (${MIN_RATING})
      -s, --separator           separator between similar sets (${SEPARATOR})
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

  main({
    dir: OPTIONS.input[0],
    ignoreFile: OPTIONS.flags['ignore'],
    minRating: OPTIONS.flags['minimum'],
    separator: OPTIONS.flags['separator']
  });
}

export function main(options) {
  const ignores = readIgnores(options.ignoreFile, options.separator);
  const files = fs.readdirSync(options.dir);
  const total = files.length;
  const bar = new progress(':bar :percent | ETA: :etas | :current/:total', { total, stream: process.stdout });
  let file;
  while (file = files.shift()) {
    bar.tick();
    const matches = findSimilar(file, files, options.minRating, ignores);
    if (matches.length) {
      bar.interrupt(file);
      matches.forEach(match => { bar.tick(); bar.interrupt(match.file) });
      bar.interrupt(options.separator);
    }
  }
  console.log(); // flush line
}

function findSimilar(file, files, minRating, ignores) {
  const ignore = (ignores && ignores.get(file)) ?? [];
  return files.map(f => { return { file: f, rating: dice(file, f) }})
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
