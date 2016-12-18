var path = require('path');
var mkdir = require('safe-mkdir').mkdir;
function getCacheRoot(data) {
  this.log(JSON.stringify({
    dir: this.cacheDir,
    name: data.name,
    version: data.version
  }));
  return path.resolve(this.cacheDir, data.name, data.version);
}
function makeCache(cb) {
  mkdir(this.cacheDir, cb);
}

module.exports = function (ccp) {
  ccp.getCacheRoot = getCacheRoot;
  ccp.makeCache = makeCache;
};