// requests.js - listen and modify cookies on outgoing/incoming requests
var events = require("sdk/system/events");
var { Cc, Ci, Cu, Cr, components } = require("chrome");
var local_data = require("./cookie_interface.js");
var utils = require("./utils.js");
var logger = require("./logger.js");
var {CryptoJS} = require("cryptojs-1sp");
var timers = require("sdk/timers.js");
var loc_list = require("./location_listener.js");

var urls_to_ctxs = {};

var tab_helpers = require("sdk/tabs/helpers.js");
const LOAD_INITIAL_DOCUMENT = Ci.nsIChannel.LOAD_INITIAL_DOCUMENT_URI;

var converter =
        Cc["@mozilla.org/intl/scriptableunicodeconverter"].
        createInstance(Ci.nsIScriptableUnicodeConverter);
converter.charset = "UTF-8";

function addCacheKey(channel, key){
    try {
        var cacheChannel = channel.QueryInterface(Ci.nsICachingChannel);
        var cacheKey = cacheChannel.cacheKey
                .QueryInterface(Ci.nsISupportsPRUint32);
        var key_prefix = Cc["@mozilla.org/supports-PRUint32;1"]
                .createInstance(Ci.nsISupportsPRUint32);
        var key_hasher = Cc["@mozilla.org/security/hash;1"]
                .createInstance(Ci.nsICryptoHash);
        key_hasher.init(key_hasher.MD5);
        var result = {};
        var data = converter.convertToByteArray(key, result);
        key_hasher.update(data, data.length);
        var key_hash_str = key_hasher.finish(false);

        // var key_hash_str = CryptoJS.MD5(key);
        var key_hash = 0;
        for(var i = 0; i < key_hash_str.length && i < 8; i++ ){
            key_hash += key_hash_str.charCodeAt(i) << (i << 3);
        }
        key_prefix.data = key_hash + cacheKey;
        channel.cacheKey = key_prefix;
    } catch( e if e.result == Cr.NS_NOINTERFACE){}
}

function http_modify(context, channel, theDomWin){
    if(context){
        // addCacheKey( channel, context.id.toString() );

        var cookie_str = local_data.get_cookie_string(context, 
                                                      channel.URI, 
                                                      true, 
                                                      channel, 
                                                      theDomWin);
        if(cookie_str){
            channel.setRequestHeader("Cookie", cookie_str, false);
        } else {
            channel.setRequestHeader("Cookie","", false);
        }
    } else {
        channel.loadFlags |= channel.LOAD_BYPASS_CACHE; // no caching flags
        channel.loadFlags |= channel.INHIBIT_CACHING;
        channel.loadFlags |= channel.LOAD_ANONYMOUS;
    }
}

function http_examiner(event){
    var channel = event.subject.QueryInterface(Ci.nsIHttpChannel);
    var win = utils.windowFromChannel(channel);
    var store = loc_list.getStoreFromChannel(channel, win, false);
    http_examine(store, channel, win);
}

function http_examine(context, channel, win){
    var cookieStr = null;
    try {
        cookieStr = channel.getResponseHeader("Set-Cookie");
        if(context){
            channel.setResponseHeader("Set-Cookie", "", false);
        } else if(cookieStr){
            console.warn("set-cookie with no persona", cookieStr, channel.URI.spec);
        }
    } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}
    var tab = utils.xul_tab_for_win(win);
    if(context && cookieStr){
        local_data.set_cookie_string(context,
                                     channel.URI,
                                     cookieStr,
                                     channel,
                                     tab );
    }
    logger.log_request(false, channel.URI, !!cookieStr, win);
}

function http_hook_modify(event){
    var channel = event.subject.QueryInterface(Ci.nsIHttpChannel);
    var theDomWin = utils.windowFromChannel(channel);
    var store = loc_list.getStoreFromChannel(channel, theDomWin, true);
    http_modify(store, channel, theDomWin);
}
function http_hook_examiner(event){
    var channel = event.subject.QueryInterface(Ci.nsIHttpChannel);
    var theDomWin = utils.windowFromChannel(channel);
    var store = loc_list.getStoreFromChannel(channel, theDomWin, true);
    http_examine(store, channel, theDomWin);
}

exports.off_hooks = function(){
    events.off("http-on-opening-request", http_hook_modify);
    events.off("http-on-examine-response", http_hook_examiner );
};

exports.on_hooks = function(){
    events.on("http-on-modify-request", http_hook_modify);
    events.on("http-on-examine-response", http_hook_examiner);
};
