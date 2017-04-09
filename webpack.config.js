var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
var WebpackCleanupPlugin = require('webpack-cleanup-plugin');
var webpack = require('webpack');

var isProduction = process.env.NODE_ENV === 'production';


console.log('Building with NODE_ENV', process.env.NODE_ENV);

var config = {
    entry: "./src/js/main.js",
    output: {
        path: __dirname + '/dist/',
        filename: "bundle.js"
    },
    module: {
        loaders: [
            {
                test: /\.html$/,
                loader: 'ejs-loader'
            }
        ]
    },

    plugins: [new WebpackCleanupPlugin()]
};


if (isProduction) {
    config.plugins.push(
        new UglifyJsPlugin({
            compress: {
                sequences: true,
                properties: true,
                drop_debugger: true,
                dead_code: true,
                unsafe: true,
                conditionals: true,
                comparisons: true,
                evaluate: true,
                booleans: true,
                unused: true,
                loops: true,
                cascade: true,
                keep_fargs: false,
                if_return: true,
                join_vars: true,
                drop_console: true
            },
            'mangle-props': true,
            mangle: true,
            beautify: false
        }));
}


config.plugins.push(
    new webpack.DefinePlugin({
        ASD: JSON.stringify('DDD')
    }),
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


module.exports = config;

