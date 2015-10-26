// main.js - entry point into addon
var debugging = false;

exports.is_debug = function(){
    return debugging;
};

var { Cc, Ci, Cu, Cr, components } = require("chrome");
var data = require("sdk/self").data;

var requests = require("./requests.js");
var persona_manager = require("./persona_manager.js").manager();
var persona_choser = require("./persona_choser.js").choser();
var ui = require("./ui.js");
var prop_init = require("./prop_init.js");
var storage = require("./storage.js");
var pref_utils = require("./my_pref_utils.js");
var weblistener = require("./event_listener.js");
var utils = require("./utils.js");
var logger = require("./logger.js");
var policy = require("./policy_matcher.js");
var navbar_button = require("navbar-widget.js");
var debug = require("debugger.js");
var alexa = require("./alexa-wrapper.js").alexa_module;

var cookie_interface = require("./cookie_interface.js");
var locations = require("./locations.js");
var panels = require("./my_panel.js");

var event_manager = require("./event_manager.js");

var history_man = require("./history-query.js");
var unconfigured = require("./unconfigured-hosts.js").manager;
var grouping_page = require("./grouping-page.js");

exports.onSaveConfig = function(){
    alexa.save_data();
    locations.save_data();
    navbar_button.save_data();
    persona_manager.save();
    persona_choser.unload();
    policy.save_to_file();
    utils.save();
};

exports.onUnload = function(reason){
    weblistener.onUnload();
    prop_init.unload();
    requests.off_hooks();
    persona_manager.save();
    persona_choser.unload();
    ui.unload();
    pref_utils.onUnload();

    // never called with "uninstall" https://bugzilla.mozilla.org/show_bug.cgi?id=627432#c12
    logger.on_unload(reason == "uninstall");
    policy.unload();
    alexa.save_data();

    locations.unload();
    utils.save();
    panels.unload();
    unconfigured.unload();

    storage.unload();           // must occur after everything else is unloaded

};

exports.main = function(options, callbacks){
    if(options.loadReason == "install" ||
       options.loadReason == "upgrade" ||
       options.loadReason == "enable" ||
       options.loadReason == "downgrade"){
        // require("restart_prompt.js").show();
    }
    storage.load(function(){
        if(options.staticArgs.study_uid){
            logger.set_study_uid(options.staticArgs.study_uid);
        }
        
        logger.do_checkin();
        utils.load();
        locations.load();

        logger.on_load(!options.staticArgs.logging);

        persona_manager.load();
        persona_choser.load();

        cookie_interface.load();

        pref_utils.onLoad();

        requests.on_hooks();

        prop_init.init();

        ui.load(options);

        weblistener.onLoad();

        policy.load();

        alexa.onload();
        unconfigured.load();

        if("performance" in options.staticArgs){
            console.log("running performance tests");
            require("./performance.js").run_perf(options.staticArgs.parallel,
                                                 options.staticArgs.logsize);
        }
        if(options.loadReason == "install" &&
           options.staticArgs.initrules){
            console.log("preconfiguring...");
            persona.preconfigure(options.staticArgs.initrules);
        }
        
        var loghist = require("./log-history-frontend.js");
        loghist.onload(("webhistory" in options.staticArgs) ?
                       "webhistory" : "logging");
        if(options.staticArgs.enable_clear_log){
            loghist.enable_clear_log();
        }

        if(options.loadReason == "install"){
            grouping_page.openPersonaGrouping();
        }
    });
};
