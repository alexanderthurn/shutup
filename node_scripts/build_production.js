var helper = require('./helper')
var fs = require('fs-extra');
var path = require('path');

fs.removeSync('dist/bundle.js');

helper.walk('dist', function (err, results) {

    if (err) throw err;

    results.filter(function (fileName) {
        return fileName.match(/\.(htm|html|js|css|svg)$/g);
    }).map(function (fileName) {
        helper.compressFile(fileName);
    });


})

fs.copySync(path.resolve(__dirname, './.htaccess'), 'dist/.htaccess');


