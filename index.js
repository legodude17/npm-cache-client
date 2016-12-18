var defaults = require('defaults');
var path = require('path');
var home = require('os-homedir')();
var rps = require('realize-package-specifier');
var tmp = require('os').tmpdir();
var noop = function(){};
function CacheClient(options) {
  this._opts = defaults(options, {
    dir: path.resolve(
      process.platform === 'win32' && process.env.APPDATA || home,
      process.platform === 'win32' ? 'npm-cache' : '.npm'),
    log: noop,
    warn: noop,
    error: noop,
    tmp: tmp
  });
  this.cacheDir = this._opts.dir;
  this.log = this._opts.log;
  this.log.warn = this._opts.warn;
  this.log.error = this._opts.error;
}

var ccp = CacheClient.prototype;

ccp.add = function (args, where, cb) {
  var spec;

  this.log('add args ' + args);

  if (args[1] === undefined) args[1] = null;

  // at this point the args length must be 2
  if (args[1] !== null) {
    spec = args[0] + '@' + args[1];
  } else if (args.length === 2) {
    spec = args[0];
  }

  this.log('add spec ' + spec);

  if (!spec) return cb(new Error("No spec found"));

  rps(spec, where, function (err, p) {
    if (err) cb(err);
    this.log('add result ' + JSON.stringify(p));
    switch (p.type) {
      case 'directory':
        this._addDir(p.spec, cb);
        break;
      case 'local':
        this._addTarball(p.spec, null, null, cb);
        break;
      default:
        return cb(new Error('Sorry, this module doesn\'t support typ e' + p.type + ' yet. :('));
    }
  }.bind(this));
};

ccp.remove = function () {
  throw new Error('remove is not implemented :(');
};

ccp.list = function () {
  throw new Error('list is not implemented :(');
};

require('./lib/add')(ccp);
require('./lib/util')(ccp);

module.exports = CacheClient;