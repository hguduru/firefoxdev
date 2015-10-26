// debugger.js - grabbing a log of debuging info for remote debug logs
var { Cc, Ci, Cu, Cr, components } = require("chrome");
var utils = require("utils.js");
var storage = require("storage.js");

var consoleService = Cc["@mozilla.org/consoleservice;1"]
    .getService(Ci.nsIConsoleService);

var { Unknown, Factory, Service } = require("sdk/platform/xpcom");
var { Class } = require('sdk/core/heritage');

var messages = [];

var console_listener = Class({
    extends : Unknown,
    interfaces : ["nsIConsoleListener", "nsISupportsWeakReference"],
    observe : function(mess){
        try {
            mess.QueryInterface(Ci.nsIScriptError);
            messages.push(mess.toString());
        } catch (e){}
    }
});

var console_listener_fact = Factory({ Component : console_listener });
var the_listener = components.
    classesByID[console_listener_fact.id].
    createInstance(Ci.nsIConsoleListener);

exports.load = function(){
    consoleService.registerListener(the_listener);
};

exports.unload = function(){
    consoleService.unregisterListener(the_listener);
};

exports.dump = function(){
    return messages;
};

