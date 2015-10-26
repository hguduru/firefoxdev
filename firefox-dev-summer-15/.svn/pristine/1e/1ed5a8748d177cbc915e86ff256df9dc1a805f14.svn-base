// my_tabs.js - utility library for tabs. Replaced in some versions of the
// addon. This version uses XUL tabs instead of SDK tabs. 
var { Cc, Ci, Cu, Cr, components } = require("chrome");
var tabs = require("sdk/tabs");
var utils = require("./utils.js");
var tabs_utils = require("sdk/tabs/utils");
var my_tabs = require("./my_tabs.js");

var session = Cc['@mozilla.org/browser/sessionstore;1']
    .getService(Ci.nsISessionStore);

exports.get_xul_tab = function(tab){
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator);
    // Dangerous assumption
    var recentWindow = wm.getMostRecentWindow("navigator:browser");
    var tb = tabs_utils.getTabBrowser(recentWindow);
    if(tb.tabs.length > tab.index){
        if(tb.tabs[tab.index].label == tab.title){
            return tb.tabs[tab.index];
        }
    }
    
    var enumerator = wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()){
        var nextWin = enumerator.getNext();
        tb = tabs_utils.getTabBrowser(nextWin);
        if(tb.tabs.length > tab.index){
            if(tb.tabs[tab.index].label == tab.title){
                return tb.tabs[tab.index];
            }
        }
    }
    console.warn("cannot find xul tab", tab.url);
    return null;
};

exports.get_tab_key = function(tab, key, def_val){
    if(tab){
        var val = session.getTabValue(tab, key);
        if(val){
            return JSON.parse(val);
        }
    }
    return arguments.length == 3 ? def_val : null;
};

exports.get_tab_state = function(tab){
    return session.getTabState(tab);
};

exports.set_tab_key = function(tab, key, val){
    if(tab){
        var real_val = JSON.stringify(val);
        if(real_val !== undefined){
            session.setTabValue(tab, key, real_val);
        }
    }
};

exports.active_tab = function(win){
    if(!win){
        var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
            .getService(Ci.nsIWindowMediator);
        var recentWindow = wm.getMostRecentWindow("navigator:browser");
        win = recentWindow;
    }
    let tabBrowser = tabs_utils.getTabBrowser(win);
    if(!tabBrowser){
        console.trace();
    }
    return tabBrowser.selectedTab;
    // var content = win.content;
    // return utils.xul_tab_for_win(content);
};

exports.is_active = function(tab){
    return tab.selected;
};

exports.reload = function(tab){
    // tab.reload();
    var browser = tabs_utils.getBrowserForTab(tab);
    var orig = my_tabs.get_tab_key(tab, "persona-orig-uri");
    if(orig){
        browser.loadURI(orig);
    } else {
        browser.reload();
    }
};

exports.tabs = function(){
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");
    var ans = [];
    while(enumerator.hasMoreElements()){
        var nextWin = enumerator.getNext();
        var tb = tabs_utils.getTabBrowser(nextWin);
        for(var j = 0; j < tb.tabs.length; j++){
            ans.push(tb.tabs[j]);
        }
    }
    return ans;
};

exports.windows = function(){
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator);
    var enumerator = wm.getEnumerator("navigator:browser");
    var ans = [];
    while(enumerator.hasMoreElements()){
        ans.push(enumerator.getNext());
    }
    return ans;
};

exports.active_window = function(){
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
        .getService(Ci.nsIWindowMediator);
    var recentWindow = wm.getMostRecentWindow("navigator:browser");
    return recentWindow;
};

var watchers = [];

exports.watch_windows = function(cb){
    watchers.push(cb);
};

exports.on_new_win = function(win){
    watchers.forEach(function(wat){
        wat(win);
    });
};

exports.active_url = function(){
    return tabs.activeTab.url;
};

exports.tab_is_ready = function(tab){
    if(!tab)
        tab = exports.active_tab();
    return false;
    var win = tab.ownerDocument.defaultView;
    var tabBrowser = win.gBrowser;
    var browser = tabBrowser.getBrowserForTab(tab);
    return browser.contentDocument.readyState == "complete" ||
        browser.contentDocument.readyState == "interactive";
};
