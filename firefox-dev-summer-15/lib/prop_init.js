// prop_init.js - injects persona manager into content pages

var { Cc, Ci, Cu, Cr, components } = require("chrome");
var local = require("./cookie_interface.js");
var { Class } = require('sdk/core/heritage');
var { Unknown, Factory } = require("sdk/platform/xpcom");
var utils = require("./utils.js");
var persona_manager = require("./persona_manager.js").manager();
var persona_choser = require("./persona_choser.js").choser();
var ui = require("./ui.js");

var io_svc = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);

var contract_id = "@billy.cmu.edu/storeinit";
var window_prop = "storageManager123pleasedontoverwriteme";

var WindowStorageInit = Class({
    extends : Unknown,
    interfaces : ["nsIDOMGlobalPropertyInitializer"],
    init : function(window){
        if(window instanceof Ci.nsIDOMChromeWindow){
            return {};
        }
        var win = window.QueryInterface(Ci.nsIDOMWindow);
        var tab = utils.xul_tab_for_win(win);
        var myURI = io_svc.newURI(win.location, null, null);
        var store_id = persona_choser.currentPersona(tab);
        var store = persona_manager.getPersona(store_id);
        return new (function(){
            this.getcookie = function(){
                return local.get_cookie_string(store,
                                               io_svc.newURI(win.location.toString(), null, null),
                                               false,
                                               win,
                                               win);
            };
            this.setcookie = function(arg){
                var str = JSON.parse(arg);
                return local.set_cookie_string(store,
                                               io_svc.newURI(win.location.toString(), null, null),
                                               str,
                                               win,
                                               tab );
            };
            
            this.persona_id = store.id;
            
            this.__exposedProps__ = {
                getcookie : "r",
                setcookie : "r",
                persona_id : "r"
            };
        })();
    }
});

var factory = Factory({
    Component : WindowStorageInit,
    contract : contract_id
});

var catMan = Cc["@mozilla.org/categorymanager;1"]
    .getService(Ci.nsICategoryManager);

exports.init = function(){
    catMan.addCategoryEntry("JavaScript-global-property", window_prop, contract_id, false, true);
};

exports.unload = function(){
    catMan.deleteCategoryEntry("JavaScript-global-property", window_prop, false);
};
