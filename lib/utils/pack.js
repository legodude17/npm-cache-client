var Packer = require('fstream-npm');
var tar = require('tar');
var zlib = require('zlib');
var fs = require('graceful-fs');

function pack(tarball, folder, cb) {
  new Packer({ path: folder, type: 'Directory', isDirectory: true })
    .on('error', function (er) {
      cb(er);
    })

    // npm includes some proprietary attributes in the
    // package tarball.  This is sane, and allowed by the spec.
    .pipe(tar.Pack())
    .on('error', function (er) {
      cb(er);
    })
    .pipe(zlib.Gzip())
    .on('error', function (er) {
      cb(er);
    })
    .pipe(fs.createWriteStream(tarball))
    .on('error', function (er) {
      cb(er);
    })
    .on('close', cb);
}

module.exports = pack;