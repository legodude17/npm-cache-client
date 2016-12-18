var rm = require('rimraf');
var fs = require('graceful-fs');
var path = require('path');
var zlib = require('zlib');
var tar = require('tar');
var fstream = require('fstream');
var readJson = require('read-package-json');

function unpack(tarball, dest, cb_) {
  console.log('unpack:', tarball, dest);
  rm(dest, function (err) {
    if (err) return cb_(err);
    var cbCalled = false;

    function cb(er) {
      if (cbCalled) return;
      cbCalled = true;
      if (er) return cb_(er);
      console.log('cb called!');
      // console.log('contents:', fs.readdirSync(dest));
      fs.readdir(path.resolve(dest), function (er, data) {
        if (er) return cb_(er);
        console.log(data);
        rm(dest, function (er) {
          cb_(er, data);
        });
      });
    }

    var fst = fs.createReadStream(tarball);
    fs.stat(tarball, function (err, st) {
      if (err) return fst.emit('error', err);
      console.log('stat:', st);
      if (st.size === 0) {
        var er = new Error('0-byte tarball');
        fst.emit('error', er);
      }
    });

    var extractOpts = {
      type: 'Directory',
      path: dest,
      strip: 1
    };

    var sawIgnores = {};
    extractOpts.filter = function () {
      // symbolic links are not allowed in packages.
      console.log(this);
      if (this.type.match(/^.*Link$/)) {
        return false;
      }

      // Note: This mirrors logic in the fs read operations that are
      // employed during tarball creation, in the fstream-npm module.
      // It is duplicated here to handle tarballs that are created
      // using other means, such as system tar or git archive.
      if (this.type === 'File') {
        var base = path.basename(this.path);
        console.log('base path:', base);
        if (base === '.npmignore') {
          sawIgnores[this.path] = true;
        } else if (base === '.gitignore') {
          var npmignore = this.path.replace(/\.gitignore$/, '.npmignore');
          if (sawIgnores[npmignore]) {
            // Skip this one, already seen.
            return false;
          } else {
            // Rename, may be clobbered later.
            this.path = npmignore;
            this._path = npmignore;
          }
        }
      }
    };
    fst
      .on('error', cb)
      .on('data', function OD(c) {
        // detect what it is
        if (c[0] === 0x1F &&
          c[1] === 0x8B &&
          c[2] === 0x08) {
          console.log('tar file');
          fst
            .pipe(zlib.Unzip())
            .on('error', cb)
            .pipe(tar.Extract(extractOpts))
            .on('error', cb)
            .on('entry', console.log.bind(console, 'entry:'))
            .on('error', cb)
            .on('close', cb);
        } else if (hasTarHeader(c)) {
          fst
            .pipe(tar.Extract(extractOpts))
            .on('error', cb)
            .on('close', cb);
        } else {
          var jsOpts = {
            path: path.resolve(dest, 'index.js')
          };
          fst
            .pipe(fstream.Writer(jsOpts))
            .on('error', cb)
            .on('close', function () {
              var j = path.resolve(dest, 'package.json');
              readJson(j, function (err, d) {
                if (err) return cb(err);
                fs.writeFile(j, JSON.stringify(d) + '\n', cb);
              });
            });
        }
        fst.removeListener('data', OD);
        fst.emit('data', c);
      });
  });
}

function hasTarHeader(c) {
  return c[257] === 0x75 && // tar archives have 7573746172 at position
    c[258] === 0x73 && // 257 and 003030 or 202000 at position 262
    c[259] === 0x74 &&
    c[260] === 0x61 &&
    c[261] === 0x72 &&

    ((c[262] === 0x00 &&
        c[263] === 0x30 &&
        c[264] === 0x30) ||

      (c[262] === 0x20 &&
        c[263] === 0x20 &&
        c[264] === 0x00));
}

module.exports = unpack;