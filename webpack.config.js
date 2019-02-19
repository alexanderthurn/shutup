var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var WebpackCleanupPlugin = require('webpack-cleanup-plugin');
var webpack = require('webpack');
var intlJSON = require('./src/res/en.json');
var path = require('path');
var intlJSONStringified = {};
Object.keys(intlJSON).map(function (key) {
    intlJSONStringified['INTL_' + key] = JSON.stringify(intlJSON[key]);
});
intlJSON = intlJSONStringified;

var isProduction = process.env.NODE_ENV === 'production';


console.log('Building with NODE_ENV', process.env.NODE_ENV, path.join(__dirname, "dist"));

var config = {
    devServer: {
        contentBase: path.join(__dirname, "dist"),
        compress: false,
        port: 9000,
        watchContentBase: true
    },
    entry: "./src/js/main.js",
    output: {
        path: __dirname + '/dist/',
        filename: "bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.html$/,
                use: 'ejs-loader'
            }
        ]
    },

    plugins: [new WebpackCleanupPlugin()]
};


config.plugins.push(
    new webpack.DefinePlugin(intlJSON),
    new HtmlWebpackPlugin({
        filename: 'index.html',
        template: "src/index.html",
        minify: {
            minifyJS: true,
            removeEmptyAttributes: true
        },
        inlineSource: '.(js|css)$',
        cache: true
    }));

if (isProduction) {

    config.plugins.push(
        new HtmlWebpackInlineSourcePlugin()
    );
}

config.mode = isProduction ? 'production' : 'development';

config.optimization = {
    minimize: isProduction
}

module.exports = config;

