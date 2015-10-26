// my_pref_utils.js - interact with FF about:config preferences
var { Cc, Ci, Cu, Cr, components } = require("chrome");
var { Class } = require('sdk/core/heritage');
var { Unknown, Factory, Service } = require("sdk/platform/xpcom");

var pref_state = {};
var pref_callbacks = {};
var pref_observers = {};

var pref_sdk = require("sdk/preferences/service");

var prefObserver = Class({
    extends : Unknown,
    interfaces : ["nsIObserver"],
    observe : function(subject, topic, data){
        subject = subject.QueryInterface(Ci.nsIPrefBranch);
        pref_state[data] = pref_sdk.get(data);
        if(data in pref_callbacks){
            pref_callbacks[data]( pref_state[data] );
        }
    }
});

var prefObsFact = Factory({
    Component : prefObserver
});

function do_listen(prefServ, name){
    pref_state[name] = pref_sdk.get(name);
    var aNewPrefObs = components.classesByID[prefObsFact.id].createInstance(Ci.nsIObserver);
    prefServ.addObserver(name, aNewPrefObs, false);
    pref_observers[name] = aNewPrefObs;
}

var loaded = false;

exports.set_pref = function(key, val){
    try{
        pref_sdk.set(key, val);
    } catch(e if e.result == Cr.NS_ERROR_UNEXPECTED){
        var prefService = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefBranch);
        prefService.deleteBranch(key);
        try {
            pref_sdk.set(key, val);
        } catch(e if e.result == Cr.NS_ERROR_UNEXPECTED){
            console.error("Cannot set preference", key, val);
        }
    }
};

exports.listen_to_pref = function(name, callback){
    if(loaded){
        var prefService = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefBranch);
        do_listen(prefService, name);
    } else {
        pref_state[name] = null;
    }
    if(callback)
        pref_callbacks[name] = callback;
};

exports.get_pref = pref_sdk.get;

exports.onLoad = function(){
    var prefService = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefBranch);
    for(var key in pref_state){
        do_listen(prefService, key);
    }
    loaded = true;
};

exports.onUnload = function(){
    var prefService = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefBranch);
    for(var key in pref_observers){
        prefService.removeObserver(key, pref_observers[key]);
    }
};

