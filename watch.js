var fs = require('fs');
fs.watch('test/example-tmp', function (evt, file) {
  console.log(file, 'had', evt);
});