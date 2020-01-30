const path = require('path');
const webpack = require('webpack');

module.exports = {
    devtool: "cheap-eval-source-map",
    mode: "production",
    context: path.resolve(__dirname, './src'),
    entry: {
        main: './main.js',
    },
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].bundle.js'
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'all'
                }
            }
        }
    },
    devServer: {
        contentBase: path.join(__dirname, './dist'),
        compress: true,
        hot: true,
        port: 9000
    },
};