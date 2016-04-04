module.exports = {

    // Absolute paths to dojo modules
    dojoCorePath: null,     // necessary
    dojoDijitPath: null,    // optional - if dijit Widgets are used

    // Enables dojo/parser functionality for dijit widgets
    // - register each module in dijit package via dojo-webpack-loader/lib/dojo-require
    dojoParserDijitWidgets: true,  // works if dojoDijitPath set

    // Dojo-has features for conditional code including
    // See: https://dojotoolkit.org/reference-guide/1.10/dojo/has.html#feature-names
    staticHasFeatures: {
        "config-deferredInstrumentation": 0,
        "config-dojo-loader-catches": 0,
        "config-tlmSiblingOfDojo": 0,
        "dojo-amd-factory-scan": 0,
        "dojo-combo-api": 0,
        "dojo-config-api": 1,
        "dojo-config-require": 0,
        "dojo-debug-messages": 0,
        "dojo-dom-ready-api": 1,
        "dojo-firebug": 0,
        "dojo-guarantee-console": 1,
        "dojo-has-api": 1,
        "dojo-inject-api": 1,
        "dojo-loader": 1,
        "dojo-log-api": 0,
        "dojo-modulePaths": 0,
        "dojo-moduleUrl": 0,
        "dojo-publish-privates": 0,
        "dojo-requirejs-api": 0,
        "dojo-sniff": 1,
        "dojo-sync-loader": 0,
        "dojo-test-sniff": 0,
        "dojo-timeout-api": 0,
        "dojo-trace-api": 0,
        "dojo-undef-api": 0,
        "dojo-v1x-i18n-Api": 1,
        "dom": 1,
        "host-browser": 1,
        "extend-dojo": 1,
        "touch": 0
    },

    // Dojo selector engine.
    // See: https://dojotoolkit.org/reference-guide/1.10/dojo/query.html#selector-engines
    selectorEngine: 'lite',

    // Languages for dojo/nls module which will be in result pack.
    includeLanguages: []

};