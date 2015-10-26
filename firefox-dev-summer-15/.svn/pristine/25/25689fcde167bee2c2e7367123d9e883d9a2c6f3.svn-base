// ui.js - loads the UI browser side components
var { Cc, Ci, Cu, Cr, components } = require("chrome");
var data = require("sdk/self").data;
var panels = require("sdk/panel");
var page_mod = require("sdk/page-mod");
var event_listener = require("./event_listener.js");
var system = require("sdk/system");

var tabs = require("sdk/tabs");
var my_tabs = require("./my_tabs.js");
var timers = require("sdk/timers");

var persona_choser = require("./persona_choser.js").choser();
var policy = require("./policy_matcher.js");
var utils = require("./utils.js");
var logger = require("./logger.js");

var navbar_button = require("./navbar-widget.js");
var pref_page = require("./pref_page.js");
var grouping_page = require("./grouping-page.js");
var choose_persona_panel = require("./choose_persona_panel.js").choose_persona_panel;
var context_menu = require("./context_menu.js");
var tab_colors = require("./tab-color.js");
var new_context_panel = require("./new_context_panel.js");
var navbar_panel = require("./navbar_panel.js");
var popup_notify = require("./notification-popup.js");

var io_svc = Cc["@mozilla.org/network/io-service;1"]
        .getService(Ci.nsIIOService);

var osString = "";

exports.on_load_done = function (tab){
    var show_ask = my_tabs.get_tab_key(tab, "show_ask", false);
    if(show_ask && my_tabs.is_active(tab) // &&
       // my_tabs.tab_is_ready(tab)
      ){
        choose_persona_panel.show(show_ask);
        my_tabs.set_tab_key(tab, "show_ask", false);
    } // else if(show_ask && my_tabs.is_active(tab)) {
    //     timers.setTimeout(function(){
    //         exports.on_load_done(tab);
    //     }, 1000);
    // }
};

page_mod.PageMod({
    include : "*",
    contentScriptFile : data.url("localStorageManager.js"),
    contentScriptWhen : "start", // must load before anything
    attachTo : ["frame", "top"]
});

function show_ask_panel(tab, opts, reason){
    opts = opts || {};
    if(my_tabs.tab_is_ready(tab) && my_tabs.is_active(tab)){
        choose_persona_panel.show(opts);
    } else {
        my_tabs.set_tab_key(tab, "show_ask", opts);
        my_tabs.set_tab_key(tab, "show_ask_reason", reason);
        timers.setTimeout(function(){
            exports.on_load_done(tab);
        }, 1000);
    }
}

exports.show_ask_panel = show_ask_panel;

function hide_ask_panel(tab){
    choose_persona_panel.hide();
    if(!my_tabs.get_tab_key(tab, "show_ask_reason", false)){
        my_tabs.set_tab_key(tab, "show_ask", false);
    }
    my_tabs.set_tab_key(tab, "save-chose-state", false);
}

exports.hide_ask_panel = hide_ask_panel;

function set_persona(id, tab, dontreload){
    tab = tab ? tab : my_tabs.active_tab();
    persona_choser.setPersona(tab, id);
    my_tabs.set_tab_key(tab, "user_selected", {
        "id" : id,
        "url" : my_tabs.active_url()});
    if(!dontreload){
        my_tabs.reload(tab);
    }
}
exports.set_persona = set_persona;

function on_selected_tab(tab){
    choose_persona_panel.hide();
    var show_ask = my_tabs.get_tab_key(tab, "show_ask", false);
    if(show_ask){
        choose_persona_panel.show(show_ask);
        my_tabs.set_tab_key(tab, "show_ask", false);
    }
}

exports.on_selected_tab = on_selected_tab;

var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
        .getService(Ci.nsIStyleSheetService);

function css_chrome_sheets(){

    var runtime = Cc["@mozilla.org/xre/app-info;1"]
            .getService(Ci.nsIXULRuntime);
    runtime.logConsoleErrors = true;
    var osString = runtime.OS;
    var ans = [];
    
    if(system.version >= "29.0.0"){
        ans.push("tbb_chrome_29.css");
    } else {
        ans.push("tbb_chrome_pre29.css");
    }
    
    if(osString == "Darwin"){
        ans.push("mac_chrome.css");
    } else {
        if(system.version >= "29.0.0"){
            ans.push("win_chrome_post29.css");
        } else {
            ans.push("win_chrome.css");
        }
    }
    return ans.map(function(aname){
        return io_svc.newURI(data.url(aname), null, null);
    });
}

exports.unload = function(){
    navbar_button.unload();
    pref_page.unload();
    grouping_page.unload();
    context_menu.unload();
    tab_colors.unload();
    choose_persona_panel.unload();
    new_context_panel.unload();
    navbar_panel.unload();
    popup_notify.unload();

    var sheets_registered = css_chrome_sheets();
    for(var i = 0; i < sheets_registered.length; i++) {
        sss.unregisterSheet(sheets_registered[i], sss.USER_SHEET);
    }
};

exports.load = function(options){
    navbar_button.load(options);
    pref_page.load();
    grouping_page.load();
    context_menu.load();
    tab_colors.load();
    choose_persona_panel.load();
    new_context_panel.load();
    navbar_panel.load();
    popup_notify.load();
    

    var sheets_to_register = css_chrome_sheets();
    for(var i = 0; i < sheets_to_register.length; i++) {
        sss.loadAndRegisterSheet(sheets_to_register[i], sss.USER_SHEET);
    }
};
