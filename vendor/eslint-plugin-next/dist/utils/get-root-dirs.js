"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getRootDirs", {
    enumerable: true,
    get: function() {
        return getRootDirs;
    }
});
// Project patch: replace the unpatched braces dependency chain; all rules remain upstream.
var _tinyglobby = require("tinyglobby");
var _isAbsolute = require("path").isAbsolute;
/**
 * Process a Next.js root directory glob.
 */ var processRootDir = function(rootDir) {
    var pattern = rootDir.replace(/\\/g, '/');
    if (pattern.length > 4096) throw new Error('Next rootDir glob exceeds the 4096 character safety limit');
    var depth = 0;
    for (var character of pattern) {
        if ('{[('.includes(character) && ++depth > 32) throw new Error('Next rootDir glob exceeds the 32 level nesting safety limit');
        if ('}])'.includes(character)) depth = Math.max(0, depth - 1);
    }
    var matches = (0, _tinyglobby.globSync)(pattern, {
        onlyDirectories: true,
        expandDirectories: false,
        absolute: _isAbsolute(pattern)
    }).map(function(dir) { return dir.replace(/\/$/, ''); });
    // fast-glob excludes each literal prefix directory for a terminal /** pattern.
    if (pattern.endsWith('/**')) {
        var bases = new Set((0, _tinyglobby.globSync)(pattern.slice(0, -3), {
            onlyDirectories: true,
            expandDirectories: false,
            absolute: _isAbsolute(pattern)
        }).map(function(dir) { return dir.replace(/\/$/, ''); }));
        matches = matches.filter(function(dir) { return !bases.has(dir); });
    }
    return matches;
};
var getRootDirs = function(context) {
    var rootDirs = [
        context.cwd
    ];
    var nextSettings = context.settings.next || {};
    var rootDir = nextSettings.rootDir;
    if (typeof rootDir === 'string') {
        rootDirs = processRootDir(rootDir);
    } else if (Array.isArray(rootDir)) {
        rootDirs = rootDir.map(function(dir) {
            return typeof dir === 'string' ? processRootDir(dir) : [];
        }).flat();
    }
    return rootDirs;
};
