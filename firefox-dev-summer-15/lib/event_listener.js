// event_listener.js - listens for relevent events in the browser. e.g., new
// tabs, new windows, new requests. Notifies or caches info
var { Cc, Ci, Cu, Cr, components } = require("chrome");

var tabs_utils = require("sdk/tabs/utils");
var tabs_helpers = require("sdk/tabs/helpers");
var my_tabs = require("./my_tabs.js");
var utils = require("./utils.js");
var systemevents = require("sdk/system/events");
var events = require("./event_manager.js").global_events;
var persona_choser = require("./persona_choser.js").choser();
var ui = require("./ui.js");
var logger = require("./logger.js");
var location_listener = require("./location_listener.js");
var context_menu = require("./context_menu.js");
var tab_colors = require("./tab-color.js");
var navbar = require("./navbar-widget.js");
var timers = require("sdk/timers");

var prev_tab = null;
var inherit = false;
var inherit_window = false;
var inherit_win_persona = -1;
var inherit_url = "";

function addBrowserListeners(browser, tab){
    location_listener.addMyListener(browser, tab);
    if(inherit_window){
        persona_choser.inheritPersona(tab, inherit_win_persona, inherit_url);
    }
}

function removeBrowserListeners(browser){
    location_listener.removeMyListener(browser);
}

function loadListener(tabBrowser) {
    var ans = {
        handleEvent : function(event){
            var tab = event.target;
            if(event.type == "TabOpen"){
                var browser = tabBrowser.getBrowserForTab(tab);
                addBrowserListeners(browser, tab);
                var inherit_persona = persona_choser.currentPersona(prev_tab);
                if(inherit){
                    persona_choser.inheritPersona(tab, inherit_persona, inherit_url);
                    inherit = false;
                }
            } else if(event.type == "TabClose"){
                var browser = tabBrowser.getBrowserForTab(tab);
                removeBrowserListeners(browser);
                // persona.cleanup_ctx(tab);
            } else if(event.type == "TabSelect"){
                ui.on_selected_tab(tab);
            } else if(event.type == "TabMove"){
                ui.on_selected_tab(tab);
                events.emit("tab-persona-changed", { subject : {
                    "tab" : tab
                }});

                timers.setTimeout(function(){
                    navbar.update_all_wins();
                }, 50);

            }
        }
    };
    return ans;
};

function on_page_load(event){
    var doc = event.originalTarget;
    if(doc.defaultView && !doc.defaultView.frameElement){
        var tab = utils.xul_tab_for_win(doc.defaultView);
        if(tab)
            ui.on_load_done(tab);
    }
}

var prev_funcs = {};

function cleanupTb(tb, listener){
    tb.tabContainer.removeEventListener("TabOpen", listener);
    tb.tabContainer.removeEventListener("TabClose", listener);
    tb.tabContainer.removeEventListener("TabSelect", listener);
    tb.tabContainer.removeEventListener("TabMove", listener);
    tb.removeEventListener("load", on_page_load, true);
    tb.ownerDocument.removeEventListener("SSTabRestored", restore_listener);
    for(var i = 0; i < tb.tabs.length; i++ ){
        var browser = tb.getBrowserForTab(tb.tabs[i]);
        removeBrowserListeners(browser);
        // persona.cleanup_ctx(tb.tabs[i]);
    };
    tb.addTab = prev_funcs["addTab"];
}

function restore_listener(evt){
    var tab = evt.originalTarget;
    events.emit("tab-persona-changed", { subject : {
        "tab" : tab
    }});
}

function handleTabBrowser(win, tb){
    if(!tb){
        return;
    }
    var listener = loadListener(tb);
    if(win.opener){
        inherit_window = true;
        try{
            var inherit_tab = my_tabs.active_tab(win.opener);
            var tabBrowser = tabs_utils.getTabBrowser(win);
            var browser = tabBrowser.getBrowserForTab(inherit_tab);
            inherit_url = browser.contentWindow.location.toString();
            inherit_win_persona = persona_choser.currentPersona(inherit_tab);
        } catch(e){
            console.warn("inherit_win_error", e);
            inherit_window = false;
        }
    }
    for(var i = 0; i < tb.tabs.length; i++ ){
        var browser = tb.getBrowserForTab(tb.tabs[i]);
        addBrowserListeners(browser, tb.tabs[i]);
        inherit_window = false;
    }
    tb.billyListener = listener;
    tb.addTab = (function(prev){
        prev_funcs["addTab"] = prev;
        return function(){
            prev_tab = my_tabs.active_tab();
            var browser = tb.getBrowserForTab(prev_tab);
            if(browser.contentWindow){
                inherit = (arguments[0] !== "about:newtab") && true;
                // !(utils.differentTLD(arguments[0],
                //                      browser.contentWindow.location.toString()));

                inherit_url = browser.contentWindow.location.toString();
            } else {
                inherit = arguments[0] != "about:newtab";
            }
            var ans = prev.apply(this, arguments);
            return ans;
        };
    })(tb.addTab);
    tb.tabContainer.addEventListener("TabOpen", listener, false);
    tb.tabContainer.addEventListener("TabClose", listener, false);
    tb.tabContainer.addEventListener("TabSelect", listener, false);
    tb.tabContainer.addEventListener("TabMove", listener, false);
    tb.addEventListener("load", on_page_load, true);
    tb.ownerDocument.addEventListener("SSTabRestored", restore_listener, false);
    context_menu.modify_contextMenu(win);
    win.addEventListener("unload", function(){
        cleanupTb(tb, listener);
    }, false);
    if(inherit){
        for(var i = 0; i < tb.tabs.length; i++ ){
            var inherit_persona = persona_choser.currentPersona(prev_tab);
            persona_choser.inheritPersona(tb.tabs[i], inherit_persona, inherit_url);
        }
    }
}

function _add_listener(win){
    if(win.document.readyState == "complete"){
        var window_nodes = win.document.getElementsByTagName("window");
        var is_navigator = false;
        if(window_nodes.length){
            is_navigator = window_nodes[0].getAttribute("windowtype") == "navigator:browser";
        }
        if(is_navigator){
            let tabBrowser = tabs_utils.getTabBrowser(win);
            handleTabBrowser(win, tabBrowser);
            my_tabs.on_new_win(win);
        }
    } else {
        win.addEventListener("load", function winList(){
            _add_listener(win);
            win.removeEventListener("load", winList);
        }, false);
    }
}

function window_listener(event){
    var win = event.subject;
    _add_listener(event.subject);
}

exports.set_inherit_win = function(from_win){
    prev_tab = my_tabs.active_tab(from_win);
    var tb = from_win.gBrowser;
    var browser = tb.getBrowserForTab(prev_tab);
    if(browser.contentWindow){
        inherit = true;
        inherit_url = browser.contentWindow.location.toString();
    } else {
        inherit = false;
    }
};

exports.onLoad = function(){
    var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"]
            .getService(Ci.nsIWindowMediator);
    var enumerator = windowMediator.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()){
        var nextWin = enumerator.getNext();
        _add_listener(nextWin);
    }
    var active_win = windowMediator.getMostRecentWindow("navigator:browser");
    var active_tb = tabs_utils.getTabBrowser(active_win);

    systemevents.on("chrome-document-global-created", window_listener);
};

exports.prev_tab = function(){
    return prev_tab;
};

exports.onUnload = function(){
    // cleanup?
    systemevents.off("chrome-document-global-created", window_listener);
    var windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"]
            .getService(Ci.nsIWindowMediator);
    var enumerator = windowMediator.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()){
        var nextWin = enumerator.getNext();
        var tb = tabs_utils.getTabBrowser(nextWin);
        cleanupTb(tb, tb.billyListener);
        delete tb["billyListener"];
    }
};
