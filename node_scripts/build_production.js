var brotli = require('brotli');
var fs = require('fs');
var zopfli = require('node-zopfli');
var helper = require('./helper')

var compressFile = function (fileName) {
    var res = brotli.compress(fs.readFileSync(fileName), {
        mode: 0, // 0 = generic, 1 = text, 2 = font (WOFF2)
        quality: 11, // 0 - 11
        lgwin: 22 // window size
    });

    fs.writeFileSync(fileName + '.br', res);


    fs.createReadStream(fileName)
        .pipe(zopfli.createGzip({
            verbose: false,
            verbose_more: false,
            numiterations: 15,
            blocksplitting: true,
            blocksplittinglast: false,
            blocksplittingmax: 15
        }))
        .pipe(fs.createWriteStream(fileName + '.gz'));

};


helper.walk('dist', function (err, results) {

    if (err) throw err;

    results.filter(function (fileName) {
        return !fileName.match(/\.(br|gz|DS_Store)/g);
    }).map(function (fileName) {
        compressFile(fileName);
    });


});

