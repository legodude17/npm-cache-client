var readJson = require('read-package-json');
var path = require('path');
var mkdir = require('mkdirp');
var pack = require('./utils/pack');
var unpack = require('./utils/unpack');
var sha = require('sha');
var fs = require('graceful-fs');
var uniqueFilename = require('unique-filename');

function addDir(dir, cb) {
  var addTarball = this._addTarball.bind(this);
  readJson(path.join(dir, 'package.json'), this.log, function (er, data) {
    if (!data.name) {
      return cb(new Error('No name provided in package.json'));
    }
    if (!data.version) {
      return cb(new Error('No version provided in package.json'));
    }

    if (data.deprecated) {
      this.log.warn('deprecated: ' + data.name + '@' + data.version);
    }

    var root = this.getCacheRoot(data);
    var tgz = path.resolve(root, 'package.tgz');
    var pj = path.resolve(root, 'package/package.json');

    this.makeCache(function (err) {
      if (err) return cb(err);
      mkdir(path.dirname(pj), function (er) {
        if (err) return cb(err);
        pack(tgz, dir, function (err) {
          if (err) return cb(err);
          addTarball(tgz, data, null, cb);
          // cb(null, data);
        });
      });
    });
  }.bind(this));
}

function addTarball(tarball, pkgData, shasum, cb) {
  if (!pkgData) pkgData = {};

  // If we don't have a shasum yet, compute it.
  if (!shasum) {
    return sha.get(tarball, function (er, shasum) {
      if (er) return cb(er);
      this.log('addLocalTarball', 'shasum (computed)', shasum);
      this._addTarball(tarball, pkgData, shasum, cb);
    }.bind(this));
  }

  this.log('package data ' + JSON.stringify(pkgData));
  if (pkgData.name && pkgData.version) {
    // If we got here, it was through _addDir, so we don't need to move the tarball
    var root = this.getCacheRoot(pkgData);
    var pkg = path.resolve(root, 'package');
    var target = path.resolve(root, 'package.tgz');
    var pkgJson = path.resolve(pkg, 'package.json');
    writePkgJson(pkgData, cb);
  } else {
    // throw new Error('this module doesn\'t support adding random tarballs yet');
    var dest = uniqueFilename(this._opts.tmp, 'libnpm-unpack');
    console.log(dest);
    unpack(tarball, dest, function (er, pkgData) {
      if (er) return cb(er);
      this.makeCache(function (err) {
        if (err) return cb(err);
        mkdir(pkg, function (err) {
          if (err) return cb(err);
          fs.createReadStream(tarball)
            .on('error', cb)
            .pipe(fs.createWriteStream(target))
            .on('error', cb)
            .on('close', function () {
              pkgData._shasum = pkgData._shasum || shasum;
              writePkgJson(pkgData, cb);
            });
        });
      });
    }.bind(this));
  }

  function writePkgJson(pkgData, cb) {
    fs.writeFile(pkgJson, JSON.stringify(pkgData), cb);
  }
}

module.exports = function (ccp) {
  ccp._addDir = addDir;
  ccp._addTarball = addTarball;
};