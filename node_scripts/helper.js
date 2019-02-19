var fs = require('fs');
var path = require('path');
var brotli = require('brotli');
var zopfli = require('node-zopfli-es');

exports.walk = function (dir, done) {
    var results = [];
    fs.readdir(dir, function (err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};

exports.compressFile = function (fileName) {
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
