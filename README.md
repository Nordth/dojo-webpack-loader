# dojo-webpack-loader

> ** This repo is not maintained for a while. There is a good alternative: [dojo-webpack-plugin](https://github.com/OpenNTF/dojo-webpack-plugin) which supports webpack 2 **

[Webpack](https://webpack.github.io/) loader for [Dojo Toolkit 1.x](https://dojotoolkit.org/) (actually, tested with version 1.10). It adapts dojo modules so they can be bundled by webpack and even used out of Dojo Toolkit ecosystem.

Originally, i have wrote this loader to be able to use remarkable [dgrid](http://dgrid.io/) component in my new project which based on webpack. Later i have added support for `dijit` package, so i hope it is enough  to work with most of dojo projects.  If you have any questions or problems with loader, please feel free to ask.

Why custom loader is needed? Because of specificity of dojo modules, webpack cannot bundle them itself (when i first tried it just had greedy required all modules until it had failed in error). So `dojo-webpack-loader` transforms modules to handle dojo loaders such as `dojo/nls!`, `dojo/text!` , disables dynamic requiring (all modules should be already in bundle) and provides api for widgets registration (used by`dojo/parser`). 

You can see example of webpacked `dgrid` here:  https://rawgit.com/Nordth/dojo-webpack-loader-examples/master/dgrid_02_stores.html 

## Examples:
https://github.com/Nordth/dojo-webpack-loader-examples

## Documentation
... coming soon ...


## License
[The MIT License (MIT)](http://opensource.org/licenses/MIT)

