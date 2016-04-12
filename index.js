var defaultOptions = require("./defaultOptions");
var path = require("path");
var parser = require("./internal/parser");

// Get relative path to dependency inside dojo-webpack-loader
function loaderLibDependency(module, dep_str){
    return path.relative(path.dirname(module.resourcePath), path.join(__dirname, dep_str));
}

// Change content of module on load
function preprocessModule(module, options, content){
    var register_in_dojo_require = module.isNls && module.normalizedName;
    
    switch (module.normalizedName) {
        // for dojo/has - inject staticHasFeatures
        case 'dojo/has':
        {
            // replace first line (for dojo 1.10)
            var line_pos = content.search(/\r|\n/);
            if (line_pos < 0) throw new Error("DojoWebpackLoader: dojo/has assumed to be multiline");
            var incjected_has_features = JSON.stringify(options.staticHasFeatures);
            content = 'define(["require"], function(require){' +
                'var module = { config: function(){ return ' + incjected_has_features + '; } };' +
                content.substr(line_pos);
            break;
        }
    }
    if (module.isDijit){
        // for dijit/* - cut legacy dynamic loading functionality
        var cut_line = 'if(has("dijit-legacy-requires")){';
        var cut_index = content.indexOf(cut_line);
        if (cut_index >= 0) {
            var end_index = parser.getCodeBlockEnd(content, cut_index + cut_line.length - 1);
            content = content.substr(0, cut_index) + content.substr(end_index + 1);
        }
        if (module.normalizedName == 'dijit/form/ComboBoxMixin'){
            cut_index = content.indexOf("require(shim");
            if (cut_index >= 0){
                var end_index = parser.getCodeBlockEnd(content, cut_index + "require".length, "()");
                content = content.substr(0, cut_index) + " throw new Error('DojoWebpackLoader: dynamic loading is not supported') " + content.substr(end_index + 1);
            }
        }
        else if (module.normalizedName == "dijit/_AttachMixin"){
            // Add "./a11yclick" dependency to prevent dynamic loading
            module.inject.dependencies.push({dep: "./a11yclick", name: "a11yclick"});
            content = content.replace("var a11yclick;", '');
        }
        register_in_dojo_require = register_in_dojo_require || options.dojoParserDijitWidgets;
    }

    if (register_in_dojo_require){
        // Inject
        // 1. dojo-webpack-loader/lib/dojo-require dependency
        module.inject.dependencies.push({dep: loaderLibDependency(module, './lib/dojo-require'), name: "dojoWebpackLoaderRequire"});
        // 2. register module in dojo-webpack-loader/lib/dojo-require
        module.inject.prepend = "return dojoWebpackLoaderRequire.register(" +
            JSON.stringify(module.normalizedName) +
            ", (function(){";
        module.inject.append = "})());";
    }

    return content;
}

// transform relative dependencies to dojo/* for dojo core module
function resolveCoreModuleDependency(package_name, core_path, resource, dep_str){
    if (!dep_str || dep_str[0] != '.') return dep_str;
    if (dep_str == '.') dep_str = path.basename(resource, path.extname(resource));
    // for relative paths only:
    var res = path.resolve(path.dirname(resource), dep_str).substr(core_path.length).replace(/\\/g, '/');
    if (res[0] != '/') res = '/' . res[0];
    return package_name + res;
}

// Normalize module paths (resolve relative paths in dojo core module)
function normalizeDependency(module, options, dep){
    if (module.isCore){
        // resource from core module
        var loaders = dep.loaders.map(function(m){ return resolveCoreModuleDependency('dojo', options.dojoCorePath, module.resourcePath, m); });
        return {
            loaders: loaders,
            main: resolveCoreModuleDependency('dojo', options.dojoCorePath, module.resourcePath, dep.main),
            conditionTrue: resolveCoreModuleDependency('dojo', options.dojoCorePath, module.resourcePath, dep.conditionTrue),
            conditionFalse: resolveCoreModuleDependency('dojo', options.dojoCorePath, module.resourcePath, dep.conditionFalse)
        }
    }
    return dep;
}

// Check value of has feature in options.staticHasFeatures
function checkHasFeature(options, feature){
    return options.staticHasFeatures[feature];
}

// Method to get module name from engine id
function dojoSelectorEngineModule(options, engine_id){
    engine_id = engine_id == "default" ? checkHasFeature(options, "config-selectorEngine") || "css3" : engine_id;
    switch (engine_id){
        case 'acme':
        case 'lite':
            return engine_id;
        case 'css2':
            return checkHasFeature(options, "dom-qsa3") ? 'lite' : 'acme';
        case 'css2.1':
            return checkHasFeature(options, "dom-qsa2.1") ? 'lite' : 'acme';
    }
    return 'lite';
}

function mapDependency(module, options, dep){
    // console.log(dep.dep, dep.name);
    var dep = parser.parseDependency(dep);
    var norm_dep = normalizeDependency(module, options, dep);
    var result_module = dep.main;
    var result_loaders = [];
    for (var i = 0; i < norm_dep.loaders.length; i++){
        switch (norm_dep.loaders[i]){
            case 'dojo/has':
                // resolve resource by dojoWebpackLoader.staticHasFeatures
                var condition = dep.condition;
                while (true){
                    var branch = options.staticHasFeatures[condition.ifTest] ? condition.ifTrue : condition.ifFalse;
                    if (typeof branch == 'object') condition = branch;
                    else {
                        result_module = branch;
                        break;
                    }
                }
                break;
            case 'dojo/node':
                // assume modules will be loaded by webpack correctly
                result_module = dep.main;
                break;
            case 'dojo/ready':
                // Sorry, not supported, just ignoring
                break;
            case 'dojo/selector/_loader':
            case 'dojo/query':
                // Use selector engine specified in options
                result_module = 'dojo/selector/' + dojoSelectorEngineModule(options, options.selectorEngine);
                break;
            case 'dojo/request/default':
                // use module by has features
                if(checkHasFeature(options, 'host-browser') || checkHasFeature(options, 'host-webworker')){
                    result_module = "dojo/request/xhr";
                }else if(checkHasFeature(options, 'host-node')) {
                    result_module = "dojo/request/node";
                }
                else throw new Error('DojoWebpackLoader: dojo/request/default cannot choose loader');
                break;
            case 'dojo/text':
                // use webpack raw-loader instead of dojo/text
                result_loaders.push("raw");
                break;
            case 'dojo/i18n':
                // Will be loaded via DojoWebpackLoader
                break;
            default:
                debugger;
                break;
        }
    }

    if (norm_dep.main == 'dojo/dojo') result_module = 'dojo/main';
    else if (norm_dep.main == 'require') result_module = loaderLibDependency(module, './lib/dojo-require');
    else if (norm_dep.main == 'module'){
        module.inject.prepend += dep.name + "={id:" + JSON.stringify(module.normalizedName ? module.normalizedName : '') + "}";
        result_module = norm_dep.main;
    }
    if (!result_module) result_module = loaderLibDependency(module, './lib/no-module');

    return (result_loaders.length ? result_loaders.join("!") + "!" : "") + result_module;
}

// Set map of 
function processNlsModule(module, parsed, options){
    try {
        var f = new Function("'using strict'; return " + parsed.moduleBody + ";");
        var nls_descr = f();
        if (nls_descr && nls_descr.root){
            var res_nls = {
                root: nls_descr.root
            };
            if (options.includeLanguages){
                options.includeLanguages.forEach(function(lang){
                   if (nls_descr[lang]){
                       module.inject.dependencies.push({
                           dep: "./" + lang + "/" + path.basename(module.resourcePath, ".js"),
                           name: "lang_" + lang.replace(/-/g, "_")
                       });
                       res_nls[lang] = true;
                   }
                });
            }
            parsed.moduleBody = JSON.stringify(res_nls);
        }
    }
    catch (err) {
        throw new Error("DojoWebpackLoader cannot load nls module " + module.resourcePath + ". Error" + err.message);
    }
}

function DojoWebpackLoader(content){
    if (this.cacheable) this.cacheable();
    // console.log("-----------------------")
    // console.log(this.resourcePath);

    // Prepare options
    var options = Object.assign({}, defaultOptions, this.options.dojoWebpackLoader);
    Object.assign(options.staticHasFeatures, defaultOptions.staticHasFeatures);
    if (!options.dojoCorePath) throw new Error("DojoWebpackLoader: dojoWebpackLoader.dojoCorePath option is not set");

    // Prepare module
    var module = {
        isCore: this.resourcePath.substr(0, options.dojoCorePath.length) == options.dojoCorePath,
        isDijit: options.dojoDijitPath ? this.resourcePath.substr(0, options.dojoDijitPath.length) == options.dojoDijitPath : false,
        isNls: this.resourcePath.match(/nls[\\\/](.*?[\\\/])?.*$/) != null,
        resourcePath: this.resourcePath,
        normalizedName: null,
        inject: {
            // dependencies which will be injected to module additionally
            // [ { dep: "module", name: "var name in module def"} ... ]
            dependencies: [],
            // Add js code at beginning of module
            prepend: "",
            // Add js code at ending of module
            append: ""
        }
    };
    if (module.isCore) module.normalizedName = resolveCoreModuleDependency('dojo', options.dojoCorePath, this.resourcePath, '.');
    else if (module.isDijit) module.normalizedName = resolveCoreModuleDependency('dijit', options.dojoDijitPath, this.resourcePath, '.');

    // Parse module
    var content = preprocessModule(module, options, content);
    var parsed = parser.parseModule(content);
    var new_deps = [];
    if (!module.isNls) {
        new_deps = parsed.deps.map(function (dep) {
            return mapDependency(module, options, dep);
        });
    }
    else {
        processNlsModule(module, parsed, options);
    }
    return parsed.save(new_deps, module.inject);
}

module.exports = DojoWebpackLoader;