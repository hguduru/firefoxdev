// cookie_interface.js - controls cookie and localstorage behavior for personas

var utils = require("./utils.js");
var storage = require("./storage.js");
var my_tabs = require("./my_tabs.js");
var cookiejar = require("./cookie_db.js");
var persona_manager = require("./persona_manager.js").manager();
var pref_utils = require("./my_pref_utils.js");
var logger = require("./logger.js");
var { Cc, Ci, Cu, Cr, components } = require("chrome");
var performance = require("./performance.js");

var unique_id = 0;

function Context(opts){
    opts = opts ? opts : {};
    for(var key in opts){
        this[key] = opts[key];
    }
    this.id = unique_id++;
    this.cookies = this.id;
}

exports.load = function(){
    var personas = persona_manager.personaList().map(function(id){
        return persona_manager.getPersona(id);
    });
    var max_ctx_ids = personas.map(function(aPer){
        return Math.max(Math.max.apply(null, Object.keys(aPer.ctxs).map(function(ctx){
            return aPer.ctxs[ctx].id;
        })), 0);
    });
    unique_id = Math.max(0, Math.max.apply(null, max_ctx_ids)) + 1;
};

var thirdPartyUtil = Cc["@mozilla.org/thirdpartyutil;1"]
        .getService(Ci.mozIThirdPartyUtil);

var permissionSvc = Cc["@mozilla.org/permissionmanager;1"]
        .getService(Ci.nsIPermissionManager);

function can_set_data(aPersona, uri, channelOrWindow, cookie){
    // checks that cookie is compliant with user preferences
    var third_party = false;
    var permission = permissionSvc.testPermission(uri, "cookie");
    var permission_persona = permissionSvc.testPermission(uri, "cookie"+aPersona.name);
    var permission_persona_third = permissionSvc.testPermission(uri,
                                                                "cookie-third-party"+aPersona.name);
    var channel = null;
    var window = null;
    if(channelOrWindow){
        try {
            channel = channelOrWindow.QueryInterface(Ci.nsIChannel);
            third_party = thirdPartyUtil.isThirdPartyChannel(channel);
            // try {
            //     var p3p = channel.getResponseHeader("p3p");
            // } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE ) {}
        } catch (e if e.result == Cr.NS_NOINTERFACE) {
            window = channelOrWindow.QueryInterface(Ci.nsIDOMWindow);
            third_party = thirdPartyUtil.isThirdPartyWindow(window);
        } catch (e if e.result == Cr.NS_ERROR_ILLEGAL_VALUE ){}
    }
    var need_visited = ( pref_utils.get_pref("network.cookie.cookieBehavior") == 3 ||
                         aPersona.third_party_policy == "visited" ) && third_party;
    var visited = true;
    if(need_visited){
        // Accept third party cookies from visited
        visited = utils.domain_visited(uri);
    }
    var deny =
            (pref_utils.get_pref("network.cookie.cookieBehavior") == 2 ||
             aPersona.cookies_policy == "deny" ||
             permission == Ci.nsIPermissionManager.DENY_ACTION ||
             permission_persona == Ci.nsIPermissionManager.DENY_ACTION ||
             ( (pref_utils.get_pref("network.cookie.cookieBehavior") == 1 ||
                aPersona.third_party_policy == "deny" ||
                permission_persona_third == Ci.nsIPermissionManager.DENY_ACTION )
               && third_party ) ||
             !visited ) &&
            (permission != Ci.nsIPermissionManager.ALLOW_ACTION ||
             permission_persona != Ci.nsIPermissionManager.ALLOW_ACTION ||
             ( permission_persona_third != Ci.nsIPermissionManager.ALLOW_ACTION && third_party ) );

    if( deny ){
        return false;
    }

    var downgrade_to_session =
            ((pref_utils.get_pref("network.cookie.thirdparty.sessionOnly") && third_party) ||
             aPersona.cookie_duration == "session" ||
             pref_utils.get_pref("network.cookie.lifetimePolicy") == 2 ||
             permission == 3 ||
             !utils.should_save_data()) &&
            !cookie.expiration_date < Date.now();

    var should_ask = (
        (pref_utils.get_pref("network.cookie.lifetimePolicy") == 1
         && permission == Ci.nsIPermissionManager.UNKNOWN_ACTION)
            || (aPersona.cookies_duration == "ask" && permission_persona
                == Ci.nsIPermissionManager.UNKNOWN_ACTION) );
    if(should_ask && false){
        var cookiePromptSvc = Cc["@mozilla.org/embedcomp/cookieprompt-service;1"]
                .getService(Ci.nsICookiePromptService);
        // var ffcookie = cookie_man.myCookieToFFCookie(cookie);
        if(!window)
            window = utils.windowFromChannel(channel);
        // var num_cookies = cookie_man.countCookiesFromHost(uri.host, aPersona);
        var remember = {};
        // var promptRes = cookiePromptSvc.cookieDialog(
        //     window, ffcookie, uri.host, num_cookies, false, remember
        // );
        var save_res;
        switch(promptRes){
        case Ci.nsICookiePromptService.DENY_COOKIE:
            save_res = Ci.nsIPermissionManager.DENY_ACTION;
            break;
        case Ci.nsICookiePromptService.ACCEPT_COOKIE:
            save_res = Ci.nsIPermissionManager.ALLOW_ACTION;
            break;
        case Ci.nsICookiePromptService.ACCEPT_SESSION_COOKIE:
            save_res = 3;
            break;
        default:
            save_res = Ci.nsIPermissionManager.UNKNOWN_ACTION;
        }
        if(remember.value){
            if(pref_utils.get_pref("network.cookie.lifetimePolicy") == 1){
                permissionSvc.add(uri, "cookie", save_res);
            }
            if(aPersona.cookies_duration == "ask"){
                permissionSvc.add(uri, "cookie"+aPersona.name, save_res);
            }
        }
        if(promptRes == Ci.nsICookiePromptService.DENY_COOKIE){
            return false;
        } else if(promptRes == Ci.nsICookiePromptService.ACCEPT_SESSION_COOKIE){
            downgrade_to_session = true;
        }
    }
    var ans = [];
    if(downgrade_to_session){
        ans.push("session");
    }
    if(third_party){
        ans.push("thirdparty");
    }
    return ans;
}

function validate_cookie(cookie, url){
    // checks that cookie is compliant with standards
    // name/value required rfc2109 4.2.2
    if(!cookie.name){
        console.warn("cookie_rejected", "no name/value",
                     JSON.stringify(cookie));
        return false;
    }
    // TODO: rfc 4.3.2 FQDN rejection

    // don't accept cookies that are really large
    // actual spec is 4000 bytes. This is close enough...
    if(cookie.name.length + cookie.value.length > 4000){
        console.warn("cookie_rejected", "cookie too large");
        return false;
    }
    // cookie domain must be a subdomain of the host rfc 4.3.2
    var domain = cookie.domain;
    // check that domain is a subdomain of base_myURI
    if(domain[0] == "."){
        domain = domain.substring(1);
    }
    var index = url.host.indexOf(domain);
    // domain must be a suffix of base_myURI
    if(index != url.host.length - domain.length){
        console.warn("cookie_rejected", "domain not suffix of url",
                     JSON.stringify(cookie), url.spec, url.host, "index of host", index, "host", url.host, url.host.length, "domain", domain, domain.length);
        return false;
    }
    // cookie domain cannot be a public suffix
    // such as .com or .edu or .co.uk
    try{
        if(utils.getPublicSuffix(url) == domain){
            console.warn("cookie_rejected", "domain is public suffix",
                         JSON.stringify(cookie), url.spec);
            return false;
        }
    } catch (e) {
        // weird domain or maybe ip address
        // not sure here, maybe should let pass
        console.warn("cookie_rejected", "malformed domain",
                     JSON.stringify(cookie), url.spec);
        return false;
    };
    return true;
}

function get_context_for_persona(aPersona, third_party, domain_name){
    var context = aPersona ? aPersona.getContext() : new Context({empty : true});
    if(aPersona.share_policy == "first" && third_party){
        context = aPersona.getContext(domain_name);
    } else if(aPersona.share_policy == "none"){
        context = aPersona.getContext(domain_name);
    }
    return context;
}

var cookieMan = Cc["@mozilla.org/cookiemanager;1"]
        .getService(Ci.nsICookieManager);
var cookieMan2 = Cc["@mozilla.org/cookiemanager;1"]
        .getService(Ci.nsICookieManager2);
var cookieSvc = Cc["@mozilla.org/cookieService;1"]
        .getService(Ci.nsICookieService);

var splitCookieString=exports.splitCookieString=function (cookie_str){
    return cookie_str.split("\n");
};

exports.set_cookie_string = function(aPersona, uri, cookie_str, channelOrWindow, tab){
    var cookies = splitCookieString(cookie_str);
    var mod_cookies = cookies.map(function(acookie){
        return "__" + aPersona.id.toString() + "__" + acookie;

        var cookie = new cookiejar.Cookie( acookie, {
            domain : uri.host
        } );
        if(!validate_cookie(cookie, uri)){
            return false;
        }
        var permission = can_set_data(aPersona, uri, channelOrWindow, cookie);
        if(permission === false ||
           utils.in_conflict(tab)){
            // cookie_man.emit_cookie_rejected(uri);
            return false;
        }
    });
    var mod_cookie_str = mod_cookies.filter(function(e) {
        return e;
    }).join("\n");

    try {
        var channel = channelOrWindow.QueryInterface(Ci.nsIChannel);
        var http_chan = channel.QueryInterface(Ci.nsIHttpChannel);
        cookieSvc.setCookieStringFromHttp(uri, http_chan.referrer, null, mod_cookie_str, "", channel);
    } catch(e){
        cookieSvc.setCookieString(uri, null, mod_cookie_str, null);
    }

    return;
};

var header_regxp = /^__(\d+)__(.*)/;

exports.get_cookie_string = function(aPersona,
                                     uri,
                                     http_only,
                                     channelOrWindow,
                                     aWindow){
    var mod_cookie_str = "";
    var context, third_party, window;

    try {
        var channel = channelOrWindow.QueryInterface(Ci.nsIChannel);
        var http_chan = channel.QueryInterface(Ci.nsIHttpChannel);
        mod_cookie_str = cookieSvc.getCookieStringFromHttp(uri, http_chan.referrer, channel);
        third_party = thirdPartyUtil.isThirdPartyChannel(channel);
        if(!aWindow){
            window = utils.windowFromChannel(channel);
        } else {
            window = aWindow;
        }
    } catch(e){
        mod_cookie_str = cookieSvc.getCookieString(uri, null);
        if(aWindow){
            window = aWindow.QueryInterface(Ci.nsIDOMWindow);
        } else {
            window = channelOrWindow.QueryInterface(Ci.nsIDOMWindow);
        }
        third_party = thirdPartyUtil.isThirdPartyWindow(window);
    }
    var host = utils.normalize_host(window.location.toString());
    context = get_context_for_persona(aPersona, third_party, host);

    var tab = utils.xul_tab_for_win(window);

    if(mod_cookie_str &&
       mod_cookie_str != "" &&
       !utils.in_conflict(tab)){
        var cookies = mod_cookie_str.split(";").map(function(str){
            var cookie = new cookiejar.Cookie( str, {
                domain : uri.host
            } );
            if(str[0] === " "){
                return str.slice(1);
            } else {
                return str;
            }
        });
        mod_cookie_str = cookies.map(function(cookie){

            var arr = cookie.match(header_regxp);
            var persona_id = -1;
            var rest = cookie;
            if(arr && arr.length >= 3){
                persona_id = parseInt(arr[1]);
                if(isNaN(persona_id)){
                    console.warn("cookie parsing error", persona_id, cookie);
                }
                rest = arr[2];
            } else {
                console.warn("cookie parsing error", persona_id, cookie);
            }
            return [persona_id, rest];
        }).filter(function(persona_and_cookie){
            return persona_and_cookie[0] == aPersona.id;
        }).map(function(persona_and_cookie){
            return persona_and_cookie[1];
        }).join("; ");
    } else {
        mod_cookie_str = "";
    }
    return mod_cookie_str;
};

var tab_session_num = 0;

exports.Context = Context;
