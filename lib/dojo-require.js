var registered_modules = {};
function dojoRequire(module, cb){
	if (module instanceof Array){
		var res = module.map(function(m){ return dojoRequire(m); });
		if (cb) cb.apply(this, res);
	}
	else {
		if (registered_modules[module]) {
			return registered_modules[module];
		}
		else {
			console.error('Dynamic dojo require is not supported. Trying to require "' + module + '"');
		}
	}
}
dojoRequire.async = true;
dojoRequire.toUrl = function(url) {
	return url;
};
dojoRequire.register = function(module_name, module){
	registered_modules[module_name] = module;
	return module;
};
dojoRequire.unregister = function(module_name){
	delete registered_modules[module_name];
};
module.exports = dojoRequire;