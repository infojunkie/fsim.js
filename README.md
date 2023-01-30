# fsim

[![npm version](https://badge.fury.io/js/fsim.svg)](https://badge.fury.io/js/fsim)
![GitHub Build Status](https://github.com/infojunkie/isbn-info/workflows/Test/badge.svg)

A console tool to find similarly-named files.

```
npm i -g fsim
fsim /path/to/files
// TCP-IP Illustrated, Volume 1: The Protocols - W. Richard Stevens.txt
// TCP-IP Illustrated, Volume 2: The Implementation - W. Richard Stevens.pdf
// --
// The Art of Computer Programming, Vol. 1: Fundamental Algorithms - Donald E. Knuth.txt
// The Art of Computer Programming, Vol. 2: Seminumerical Algorithms - Donald E. Knuth.epub
// --
```

## Usage
```
  Usage: fsim /path/to/files

  Options:
    -r, --recursive           recurse into subdirectories (default: no recursion)
    -m, --minimum             minimum similarity rating between 0.0 and 1.0 (default: 0.7)
    -s, --separator           separator between similar sets (default: --)
    -c, --cache               use a per-directory cache of bigrams (default: no cache)
    -h, --help                show usage information
    -v, --version             show version information
```

If `fsim` finds a file `/path/to/files/.fsimignore` with the same format as its own output, it will read it and ignore the similar results that it finds contained therein. This is useful to ignore similarly-named files that are known to be different.
