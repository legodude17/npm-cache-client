"use strict";
var CacheClient = require('.');
var client = new CacheClient({
  log: console.log,
  warn: console.log,
  error: console.error,
  dir: __dirname + '/test/example-cache',
  tmp: __dirname + '/test/example-tmp'
});

client.add([__dirname + '/sample-package-1.0.0.tgz'], null, function (err, data) {
  if (err) {
    console.error(err);
  } else {
    console.log(data);
  }
});