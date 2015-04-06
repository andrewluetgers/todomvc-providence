var
path = require('path'),
webpack = require('webpack');

var appRoot = __dirname;

module.exports = {
    colors: true,
    watch: true,
    entry: {
        app: "./src/index.js",
        vendor: [
            'lodash',
            'immutable',
            // 'bluebird',
            // "react",
            // 'omniscient',
            // 'immstruct',
            // 'react-router',
            // 'react-document-title',
            'babel-runtime/regenerator',
            'babel-runtime/core-js',
            // 'babel-runtime/helpers',
        ]
    },

    output: {
        path: path.join(appRoot, "./public/js"),
        filename: "app.js"
    },
    devtool: "#source-map",

    resolve: {
        root: path.join(appRoot, "/src/"),
        modulesDirectories: ["node_modules"]
    },

    module: {
        // preLoaders: [

        //     // only transpile JSX stuff so that jshint can process just ES6 code
        //     {
        //         test: /\.jsx?$/,
        //         exclude: /node_modules/,
        //         loader: '6to5-loader?whitelist=react'
        //     }
        // ],


        loaders: [
            // {
            //     test: /\.jsx?$/,
            //     exclude: /node_modules/,
            //     loader: "jshint-loader"
            // },

            {
                test: /\.css$/,
                loader: "style-loader!css-loader"
            },

            // {
            //     test: /\.styl$/,
            //     loader: 'style-loader!css-loader!stylus-loader'
            // }
        ],
        postLoaders: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loader: 'babel-loader?optional=runtime'
            }
        ]
    },

    // jshint: {
    //     reporter: require('./webpack/jshint-reporter'),
    //     browser: true,
    //     // TODO: BROWSER_BUILD env -- see other webpack.config.js examples
    //     "devel": true,
    //     "globals": {
    //         "React": true,
    //         "Promise": true,
    //         // "Immutable": true,
    //         // "immstructor": true
    //     }
    // },

    plugins: [
        // to5Runtime wants to export to the window. This loader grabs the export
        // and instead provides it to the modules that need it.
        //
        // The 'imports?global=>{}!' is optional, but prevents to5Runtime from leaking
        // to the window object.
        //
        // Alternatively, write `require('6to5/runtime')` at the top of your entry point.
        // Leaks the object to the window, but it's simple.
        new webpack.ProvidePlugin({
            'React': 'react',
            'Promise': 'bluebird',
            // 'bluebird': 'bluebird',
            // 'Immutable'
        }),
        new webpack.DefinePlugin({
            // BROWSER_BUILD: true
        }),

        new webpack.optimize.CommonsChunkPlugin(/* chunkName= */"vendor", /* filename= */"vendor.js")
    ]
};
