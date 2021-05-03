import dice from 'fast-dice-coefficient';
import fs from 'fs';
import meow from 'meow';

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
  main({
    dir: process.argv[2],
    ignoreFile: IGNORE_FILE,
    minRating: MIN_RATING,
    separator: SEPARATOR
  });
}

export function main(options) {
  const ignores = readIgnores(options.ignoreFile, options.separator);
  const files = fs.readdirSync(options.dir);
  let file;
  while (file = files.shift()) {
    if (files.length) {
      const matches = findSimilar(file, files, options.minRating, ignores);
      if (matches.length) {
        console.log(file);
        matches.forEach(m => { console.log(m) });
        console.log(options.separator);
      }
    }
  }
}

function findSimilar(file, files, minRating, ignores) {
  const ignore = (ignores && ignores.get(file)) ?? [];
  return files.map(f => { return { file: f, rating: dice(file, f) }})
  .filter(r => r.rating > minRating && !ignore.includes(r.file))
  .sort((r1,r2) => r1.rating - r2.rating)
  .map(r => r.file)
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
      }
      return state;
    }, { ignores: new Map(), current: [] }).ignores;
  }
  catch (e) {
    return new Map();
  }
}
