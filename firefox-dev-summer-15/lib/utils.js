// utils.js - utility functions 
var { Cc, Ci, Cu, Cr, components } = require("chrome");
var tld_svc = Cc["@mozilla.org/network/effective-tld-service;1"]
        .getService(Ci.nsIEffectiveTLDService);

var private_browsing = require("sdk/private-browsing");
var my_tabs = require("./my_tabs.js");
var tab_helpers = require("sdk/tabs/helpers.js");
var window_utils = require("sdk/window/utils");
var storage = require("./storage.js");
var main = require("./main.js");

Cu.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

exports.getDomain = function getDomain(host) {
    try {
        return tld_svc.getBaseDomainFromHost(host);
    } catch (e if e.result == Cr.NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS) {
        return host;
    } catch (e if e.result == Cr.NS_ERROR_HOST_IS_IP_ADDRESS) {
        return host;
    }
};

exports.getPublicSuffix = function(url){
    tld_svc.getPublicSuffix(url);
};

exports.get_interfaces = function(obj){
    var ans = [];
    for( var i in Ci ){
        try {
            obj.QueryInterface(Ci[i]);
            ans.push(i);
        } catch(e){}
    }
    return ans;
};

exports.ir_interfaces = function(obj){
    var ans = [];
    for( var i in Ci ){
        try {
            obj.getInterface(Ci[i]);
            ans.push(i);
        } catch(e){}
    }
    return ans;
};


function should_save_data(arg){
    if(arguments.length == 1){
        //  see https://developer.mozilla.org/EN/docs/Supporting_per-window_private_browsing
        return !PrivateBrowsingUtils.isWindowPrivate(arg);
    } else {
        return !private_browsing.isPrivate();
    }
}

exports.should_save_data = should_save_data;

var logging = true;

var debug_file = null;

exports.debug = console.log;
exports.warn = console.warn;
exports.error = console.error;

function fallback(channel){
    var ans = null;
    try {
        if(channel.loadGroup){
            if(channel.loadGroup.groupObserver){
                var groupObs = channel.loadGroup.groupObserver.QueryInterface(Ci.nsILoadContext);
                ans = groupObs.associatedWindow.top;
            }
        }
    } catch(e if e.result == Cr.NS_NOINTERFACE){}
    // probably one of these:
    // ssl cert query http://en.wikipedia.org/wiki/Online_Certificate_Status_Protocol
    // favicon
    // other addon
    // google safe browsing query https://developers.google.com/safe-browsing/
    // returns null
    if(!ans){
        exports.warn("fallback failed", channel.URI.spec);
    }
    return ans;
}

var windowFromChannel = exports.windowFromChannel = function windowFromChannel(channel){
    var ans;
    try {
        var noteCB = channel.notificationCallbacks ?
                channel.notificationCallbacks :
                channel.loadGroup.notificationCallbacks;
        if(!noteCB){
            return fallback(channel);
        }
        var loadContext = noteCB.getInterface(Ci.nsILoadContext);
        ans = loadContext.associatedWindow.top;
        if(!ans){
            ans = fallback(channel);
        }
    } catch (e){
        try{
            if(noteCB){
                var domelem = noteCB.QueryInterface(Ci.nsIDOMElement);
                ans = domelem.ownerDocument.defaultView.top;
            }
            if(!ans){
                ans = fallback(channel);
            }
        } catch (e if e.result == Cr.NS_NOINTERFACE) {
            ans = fallback(channel);
        }
    }
    return ans;
};

exports.xul_tab_for_win = function(win){
    if(!win){
        return null;
    }
    var chrome_win = window_utils.getToplevelWindow(win).top;
    if(chrome_win.gBrowser &&
       chrome_win.gBrowser.getBrowserIndexForDocument){
        var doc = win.top.document;
        var tab_ind = chrome_win.gBrowser.getBrowserIndexForDocument(doc);
        if(tab_ind != -1){
            var thetab = chrome_win.gBrowser.tabs[tab_ind];
            return thetab;
        }
    }
    exports.warn("Cannot find tab for window", win.location.toString());
    return null;
};

exports.addon_name = "datapersonas";
exports.addon_display_name = "Data Personas";

var historyService = Cc["@mozilla.org/browser/nav-history-service;1"]
        .getService(Ci.nsINavHistoryService);

function result_is_visited(historyResult){
    var root = historyResult.root;
    root.containerOpen = true;
    var visited = root.childCount >= 1;
    for(var i = 0; i < root.childCount; i ++){
        var node = root.getChild(i);
    }
    root.containerOpen = false;
    return visited;
}

var visited_this_session = {};

exports.unremember_visited = function(host){
    if(host in visited_this_session){
        delete visited_this_session[host];
    }
};

exports.domain_visited = function(uri){
    var normal_host = exports.normalize_host(uri.host);
    var visited = normal_host in visited_this_session;
    visited_this_session[normal_host] = true;
    return visited;
    // var options = historyService.getNewQueryOptions();
    // options.resultType = Ci.nsINavHistoryQueryOptions.RESULTS_AS_URI;
    // // options.resultType = Ci.nsINavHistoryQueryOptions.RESULTS_AS_VISIT;
    // options.queryType = Ci.nsINavHistoryQueryOptions.QUERY_TYPE_HISTORY;

    // var query = historyService.getNewQuery();
    // query.domain = uri.host;
    // query.domainIsHost = true;
    // // query.uri = uri;

    // var result = historyService.executeQuery(query, options);
    // console.log(uri.scheme + "://" + uri.host);
    // var real_ans = result_is_visited(result);
    // return real_ans;

    // return (exports.normalize_host(uri.host) in persona.get_previous_persona_map());
};

var eTLDService = Cc["@mozilla.org/network/effective-tld-service;1"]
        .getService(Ci.nsIEffectiveTLDService);
var ioService = Cc["@mozilla.org/network/io-service;1"]
        .getService(Ci.nsIIOService);

exports.url_from_string = function(url_str){
    return ioService.newURI(url_str, null, null);
};

exports.all_host = function(host){
    var ans = "";
    if(host instanceof Ci.nsIURL){
        ans = host.host;
    } else {
        try {
            ans = ioService.newURI(host, null, null);
            return exports.normalize_host(ans);
        } catch (e) {
            if(host.indexOf("www") == 0){
                ans = host.substring(host.indexOf(".")+1);
            } else {
                ans = host;
            }
        }
    }
    return ans;
};

exports.normalize_host = function(host, dont_use_tld){
    var ans = "";
    if(host instanceof Ci.nsIURL){
        ans = host.host;
        try {
            if(!dont_use_tld){
                ans = eTLDService.getBaseDomain(host, 0);
            }
        } catch(e) {}
    } else {
        try {
            ans = ioService.newURI(host, null, null);
            return exports.normalize_host(ans, dont_use_tld);
        } catch (e) {
            ans = host;
        }
    }
    if(!ans){
        ans = "";
    }
    if(ans.indexOf("www") == 0){
        ans = ans.substring(ans.indexOf(".")+1);
    }
    return ans;
};

exports.differentTLD = function(urla, urlb){
    if(urla == "about:blank" || urlb == "about:blank" || 
       urla == "about:newtab" || urlb == "about:newtab"){
        return false;
    }
    if(urla == null || urlb == null){
        return true;
    }
    try {
        var prev_url = ioService.newURI(urla, null, null);
        var cur_url = ioService.newURI(urlb, null, null);
        var prev_tld = eTLDService.getBaseDomain(prev_url, 0);
        var cur_tld = eTLDService.getBaseDomain(cur_url, 0);
        return prev_tld != cur_tld;
    } catch(e) {
        return true;
    }
};

exports.file_picker = function(title, mode, filter){
    if(!filter){
        filter = Ci.nsIFilePicker.filterAll;
    }
    if(!mode){
        mode = Ci.nsIFilePicker.modeSave;
    }
    if(!title){
        title = "";
    }
    var filePicker = Cc["@mozilla.org/filepicker;1"]
            .createInstance(Ci.nsIFilePicker);
    filePicker.init(window_utils.getMostRecentBrowserWindow(),
                    title,
                    mode);
    filePicker.filterIndex = filter;
    var res = filePicker.show();
    if(res == Ci.nsIFilePicker.returnOK){
        return filePicker.file;
    } else {
        return null;
    }
};

exports.load = function(){
    visited_this_session = storage.read_json("visited_before", function(){
        return {};
    });
};

exports.save = function(){
    storage.save_json("visited_before", visited_this_session);
};

exports.in_conflict = function(tab){
    var incon = my_tabs.get_tab_key(tab, "persona_in_conflict", false);
    return incon;
};

function study_server_url(ext, not_relative){
    var base = main.is_debug() ? "http://localhost:8000" : "http://privacy-study.ece.cmu.edu";
    if(!not_relative && !main.is_debug()){
        base += "/sr";
    }
    return base + ext;
}
exports.study_server_url = study_server_url;
