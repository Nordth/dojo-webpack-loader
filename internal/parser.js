var parser = {};
var quoteRegExp = /['"]/;
var dependencyRegExp = /^((.*)\!)*(.*?)(\?.*?)?$/;

// define([...] - for standard amd modules
var defineAmdRegExp = /(\s*define\s*\(\s*)\[([^\]]*?)\]/m;
// define({...}) - for nls modules
var defineNlsRegExp = /(\s*define\s*\(\s*)\(?\{([\s\S]*)\}\)?\s*\)/m;

// Simple comment cutting: // and /* */
parser.cutComments = function(str){
    return str.replace(/\/\/.*$/mg, '').  // single-line
    replace(/\/\*[\s\S]*?\*\//g, '');     // multi-line
};

// parse dojo AMD-modules and return:
// {
//      deps: Array of string - dependencies,
//      save: function(new_deps, inject) - return content string with replaced dependencies and injected code
// }
parser.parseModule = function(content){
    var define_match = defineAmdRegExp.exec(content);
    var result = {
        deps: [],
        save: null,
        type: null,
        moduleBody: null
    };
    if (define_match){
        // Process header of module ctor func:
        var function_match = /function\s*\(([\s\S]*?)\)/.exec(content.substring(define_match.index + define_match[0].length));
        var function_arguments_text = parser.cutComments(function_match[1]);
        var function_arguments_array = function_arguments_text.split(",");
        var function_arguments_count = function_arguments_array.length; // count of really used dependencies
        if (function_arguments_count == 1 && function_arguments_text.trim() == '') function_arguments_count = 0;
        // Process body of module ctor func:
        var module_def_start = content.indexOf("{", function_match.index + function_match[0].length);
        var module_def_end = content.lastIndexOf("}");
        var module_def_body = content.substring(module_def_start + 1, module_def_end);

        if (function_match && module_def_start >= 0 && module_def_end >= 0) {
            var save_template_chunks = [content.substr(0, define_match.index) + define_match[1] + '['];
            var cur_chunk = 0;
            // list of module depencies: "module1", 'module2' ...
            var cur_incl_str = define_match[2];
            // remove comments from dependency block:
            cur_incl_str = parser.cutComments(cur_incl_str);
            var dep_strpos_start;
            while ((dep_strpos_start = cur_incl_str.search(quoteRegExp)) >= 0){
                save_template_chunks[cur_chunk] = (save_template_chunks[cur_chunk] ? save_template_chunks[cur_chunk] : '') +
                    cur_incl_str.substr(0, dep_strpos_start);
                // search end quote
                var start_index = dep_strpos_start + 1;
                var dep_strpos_end = -1;
                while (dep_strpos_end < 0){
                    var quote_index = cur_incl_str.indexOf(cur_incl_str[dep_strpos_start], start_index);
                    if (quote_index < 0) throw new Error("DojoWebpackLoader: cannot find closing quoute in dojo module definition");
                    if (cur_incl_str[quote_index - 1] != '\\'){
                        dep_strpos_end = quote_index;
                    }
                    else {
                        // quoute is escaped => find next
                        start_index = quote_index + 1;
                    }
                }
                // get dependency
                var dep_string = cur_incl_str.substring(dep_strpos_start + 1, dep_strpos_end);
                // simple strip slashes
                dep_string = dep_string.replace(/\\(.)/g, "$1");
                result.deps.push({
                    dep: dep_string,
                    name: function_arguments_array[result.deps.length] ? function_arguments_array[result.deps.length].trim() : undefined
                });
                // prepare for searching next dependency:
                cur_incl_str = cur_incl_str.substr(dep_strpos_end + 1);
                cur_chunk++;
            }
            // Append before function ctor;
            save_template_chunks.push(cur_incl_str + "]" + content.substring(define_match.index + define_match[0].length, define_match.index + define_match[0].length + function_match.index));
            result.moduleBody = module_def_body;
            result.type = "amd";
            result.save = function (deps, inject) {
                // res_str will be: define([...],
                var res_str = save_template_chunks[0];
                for (var i = 1; i < save_template_chunks.length; i++) {
                    if (deps.length > 0 && deps[i - 1]) res_str += JSON.stringify(deps[i - 1]);
                    if (inject && inject.dependencies.length > 0 && (i == function_arguments_count || deps.length == 0)){
                        inject.dependencies.forEach(function(d, di) {
                            res_str += (di > 0 || deps.length > 0 ? "," : "") + JSON.stringify(d.dep);
                        });
                    }
                    res_str += save_template_chunks[i];
                }
                // res_str will be: define([...], function(x, y, z
                res_str += function_match[0].substr(0, function_match[0].length - 1);
                // res_str will be: define([...], function(x, y, z <injected>
                if (inject && inject.dependencies.length > 0){
                    inject.dependencies.forEach(function(d, di) {
                        res_str += (di > 0 || function_arguments_count > 0 ? "," : "") + d.name;
                    });
                }
                // res_str will be: define([...], function(x, y, z <injected>)
                res_str += ")";
                // res_str will be: define([...], function(x, y, z <injected>) {
                res_str += content.substring( define_match.index + define_match[0].length + function_match.index + function_match[0].length, module_def_start + 1);
                // res_str will be: define([...], function(x, y, z <injected>) { <injected>
                if (inject && inject.prepend) res_str += inject.prepend;
                // res_str will be: define([...], function(x, y, z <injected>) { <injected> ...
                res_str += this.moduleBody;
                // res_str will be: define([...], function(x, y, z <injected>) { <injected> ... <injected>
                if (inject && inject.append) res_str += inject.append;
                // res_str will be: define([...], function(x, y, z <injected>) { <injected> ... <injected> })
                res_str += content.substr(module_def_end);
                return res_str;
            }
        }
    } else {
        var content_no_comments = parser.cutComments(content);
        var nls_match = defineNlsRegExp.exec(content_no_comments);
        if (nls_match){
            result.moduleBody =  "{" + nls_match[2] + "}";
            result.type = "nls";
            result.save = function (deps, inject){
                var res_str = content_no_comments.substr(0, nls_match.index);
                // define(
                res_str += nls_match[1];
                if (inject && (inject.prepend || inject.append || inject.dependencies.length > 0)){
                    // -> define([...], function( ... ){ ... })
                    res_str += "[";
                    inject.dependencies.forEach(function(d, di) {
                        res_str += (di > 0 ? "," : "") + JSON.stringify(d.dep);
                    });
                    res_str += "], function(";
                    inject.dependencies.forEach(function(d, di) {
                        res_str += (di > 0 ? "," : "") + d.name;
                    });
                    res_str += "){"; // open function
                    if (inject.prepend) res_str += inject.prepend;
                    res_str += "return " + this.moduleBody + ";";
                    if (inject.append) res_str += inject.append;
                    res_str += "}";  // close function
                }
                else res_str += this.moduleBody;
                // define(...);
                res_str += ")";
                res_str += content_no_comments.substr(nls_match.index + nls_match[0].length);
                return res_str;
            }
        }
    }
    if (!result.save) result.save = function() { return content; };
    return result;
};

// Output:
// {ifTest: "str", ifTrue: ..., ifFalse: ...}
parser.parseDojoHasTernaryExpression = function(expression){
    var stack = [];
    var symbols = /[\?:]/g;
    var match;
    var prev_index = 0;
    function add_value(val){
        if (stack.length > 0){
            if (stack[stack.length - 1].ifTrue === undefined) stack[stack.length - 1].ifTrue = val;
            else stack[stack.length - 1].ifFalse = val;
        }
    }
    while (match = symbols.exec(expression)) {
        var cut = expression.substring(prev_index, match.index);
        prev_index = match.index + match[0].length;
        if (match[0] == '?'){
            var val = {
                ifTest: cut,
                ifTrue: undefined,
                ifFalse: undefined
            };
            add_value(val);
            stack.push(val);
        }
        else {
            add_value(cut);
            if (stack.length > 1) stack.pop();
        }
    }
    var cut_last = expression.substring(prev_index);
    add_value(cut_last);
    return stack[0];
};

// Parse dependency
parser.parseDependency = function(dep){
    var match = dep.dep.match(dependencyRegExp);
    var loaders = match[2];
    if (loaders) loaders = loaders.split("!");
    var condition = null;
    if (match[4]) condition = parser.parseDojoHasTernaryExpression(match[3] + match[4]);
    return {
        name: dep.name,
        loaders: loaders ? loaders : [],
        main: match[3],
        // for dojo/has!
        condition: condition
    }
};

// Find pair { }
// from should point to first {
// type: {} - default, (), []
// return index of end }
parser.getCodeBlockEnd = function(text, from, type){
    var curles;
    if (!type) type = '{}';
    switch (type) {
        case '()': curles = /[\(\)]/g; break;
        case '[]': curles = /[\[\]]/g; break;
        default:   curles = /[{}]/g; break;
    }
    var text = text.substr(from + 1);
    var open = 1;
    var match;
    while (match = curles.exec(text)){
        if (match[0] == type[0]) open++;
        else open--;
        if (open == 0) break;
    }
    if (open != 0) throw new Error("DojoWebpackLoader: cannot find complete { } block");
    return from + 1 + match.index;
};

module.exports = parser;
