var Packer = require('fstream-npm');
var inherits = require('inherits');
var path = require('path');

function BundledPacker (props) {
  Packer.call(this, props);
}
inherits(BundledPacker, Packer);

BundledPacker.prototype.applyIgnores = function (entry, partial, entryObj) {
  if (!entryObj || entryObj.type !== 'Directory') {
    // package.json files can never be ignored.
    if (entry === 'package.json') return true;

    // readme files should never be ignored.
    if (entry.match(/^readme(\.[^\.]*)$/i)) return true;

    // license files should never be ignored.
    if (entry.match(/^(license|licence)(\.[^\.]*)?$/i)) return true;

    // copyright notice files should never be ignored.
    if (entry.match(/^(notice)(\.[^\.]*)?$/i)) return true;

    // changelogs should never be ignored.
    if (entry.match(/^(changes|changelog|history)(\.[^\.]*)?$/i)) return true;
  }

  // special rules.  see below.
  if (entry === 'node_modules' && this.packageRoot) return true;

  // package.json main file should never be ignored.
  var mainFile = this.package && this.package.main;
  if (mainFile && path.resolve(this.path, entry) === path.resolve(this.path, mainFile)) return true;

  // some files are *never* allowed under any circumstances
  // (VCS folders, native build cruft, npm cruft, regular cruft)
  if (entry === '.git' ||
      entry === 'CVS' ||
      entry === '.svn' ||
      entry === '.hg' ||
      entry === '.lock-wscript' ||
      entry.match(/^\.wafpickle-[0-9]+$/) ||
      (this.parent && this.parent.packageRoot && this.basename === 'build' &&
       entry === 'config.gypi') ||
      entry === 'npm-debug.log' ||
      entry === '.npmrc' ||
      entry.match(/^\..*\.swp$/) ||
      entry === '.DS_Store' ||
      entry.match(/^\._/) ||
      entry.match(/^.*\.orig$/)
    ) {
    return false;
  }

  // in a node_modules folder, we only include bundled dependencies
  // also, prevent packages in node_modules from being affected
  // by rules set in the containing package, so that
  // bundles don't get busted.
  // Also, once in a bundle, everything is installed as-is
  // To prevent infinite cycles in the case of cyclic deps that are
  // linked with npm link, even in a bundle, deps are only bundled
  // if they're not already present at a higher level.
  if (this.bundleMagic) {
    // bubbling up.  stop here and allow anything the bundled pkg allows
    if (entry.charAt(0) === '@') {
      var firstSlash = entry.indexOf('/');
      // continue to list the packages in this scope
      if (firstSlash === -1) return true;

      // bubbling up.  stop here and allow anything the bundled pkg allows
      if (entry.indexOf('/', firstSlash + 1) !== -1) return true;
    // bubbling up.  stop here and allow anything the bundled pkg allows
    } else if (entry.indexOf('/') !== -1) {
      return true;
    }

    // never include the .bin.  It's typically full of platform-specific
    // stuff like symlinks and .cmd files anyway.
    if (entry === '.bin') return false;

    // the package root.
    var p = this.parent;
    // the package before this one.
    var pp = p && p.parent;

    // if this entry has already been bundled, and is a symlink,
    // and it is the *same* symlink as this one, then exclude it.
    if (pp && pp.bundleLinks && this.bundleLinks &&
        pp.bundleLinks[entry] &&
        pp.bundleLinks[entry] === this.bundleLinks[entry]) {
      return false;
    }

    // since it's *not* a symbolic link, if we're *already* in a bundle,
    // then we should include everything.
    if (pp && pp.package && pp.basename === 'node_modules') {
      return true;
    }
  }
  // if (this.bundled) return true

  return Packer.prototype.applyIgnores.call(this, entry, partial, entryObj);
};

module.exports = BundledPacker;
