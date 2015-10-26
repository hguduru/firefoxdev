// context_menu.js - adds entries to the context_menu (right click) for opening
// a link in a persona
var cm = require("sdk/context-menu");

// var persona = require("./persona.js");
var persona_manager = require("./persona_manager.js").manager();

var data = require("sdk/self").data;
var my_tabs = require("./my_tabs.js");
var events = require("./event_manager.js").global_events;
var event_listener = require("./event_listener.js");
var utils = require("./utils.js");

var { Cc, Ci, Cu, Cr, components } = require("chrome");

var ctx_menu = null;
var ctx_menu_same = null;
var persona_items = null;
var persona_items_same = null;

function open_tab_in_persona(url, base, apersona){
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
            .getService(Ci.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    var ioService = Cc["@mozilla.org/network/io-service;1"]
            .getService(Ci.nsIIOService);
    var a_new_tab = win.gBrowser.addTab(null);
    open_link_in_persona(url, base, apersona, a_new_tab);
}

function open_link_in_persona(url, base, apersona, tab){
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
            .getService(Ci.nsIWindowMediator);
    var win = wm.getMostRecentWindow("navigator:browser");
    var ioService = Cc["@mozilla.org/network/io-service;1"]
            .getService(Ci.nsIIOService);
    var base_url = ioService.newURI(base, null, null);
    var the_url = ioService.newURI(url, null, base_url);
    my_tabs.set_tab_key(tab, "persona", apersona);
    my_tabs.set_tab_key(tab, "active_persona", apersona);
    var browser = win.gBrowser.getBrowserForTab(tab);
    my_tabs.set_tab_key(tab, "user_selected", { id : apersona,
                                                url : url});
    // Should set these args correctly
    browser.loadURI(the_url.spec, null, null);
}

function make_cm_item(aPersona){
    return cm.Item({
        label : aPersona.name,
        data : aPersona.id.toString()
    });
}

function on_persona_changed(event){
    var aCtx = event.subject.target;
    if(event.subject.type == "added"){
        var item = make_cm_item(aCtx);
        persona_items.push(item);
        ctx_menu.addItem(item);

        var sitem = make_cm_item(aCtx);
        persona_items_same.push(sitem);
        ctx_menu_same.addItem(sitem);
    } else if(event.subject.type == "name"){
        for(var i = 0; i < persona_items.length; i++){
            if( persona_items[i].data == aCtx.id ){
                persona_items[i].label = aCtx.name;
                persona_items_same[i].label = aCtx.name;
            }
        }
    } else if(event.subject.type == "delete"){
        var pi_item = persona_items.filter(function(item){
            return item.data == aCtx.id;
        })[0];
        ctx_menu.removeItem(pi_item);
        var pis_item = persona_items_same.filter(function(item){
            return item.data == aCtx.id;
        })[0];
        ctx_menu_same.removeItem(pis_item);
    }
}

function modify_contextMenu(window){
    var doc = window.document;
    var inNewWin = doc.getElementById("context-openlink");
    if(inNewWin){
        var myInNewWin = doc.createElement("menuitem");
        myInNewWin.setAttribute("id", "context-openlinkintab");
        myInNewWin.addEventListener("command", function(event){
            var inherit_tab = my_tabs.active_tab(window);
            // var inherit_persona = persona.current_persona(inherit_tab);
            var base_url = inherit_tab.linkedBrowser.contentWindow.location.toString();
            var link_url = window.gContextMenu.linkURL;
            if(!utils.differentTLD(base_url, link_url)){
                event_listener.set_inherit_win(window);
            }
            window.gContextMenu.openLink();
        });
        myInNewWin.setAttribute("label", "Open link in New Window");
        var inNewTabParent = inNewWin.parentNode;
        inNewTabParent.replaceChild(myInNewWin, inNewWin);
    }
}
exports.modify_contextMenu = modify_contextMenu;

exports.load = function (){
    events.on("persona-changed", on_persona_changed);

    persona_items = persona_manager.personaList().map(function(id){
        return make_cm_item(persona_manager.getPersona(id));
    });
    persona_items_same = persona_manager.personaList().map(function(id){
        return make_cm_item(persona_manager.getPersona(id));
    });
    ctx_menu = cm.Menu({
        context : cm.SelectorContext("a[href]"),
        label : "Open link in new tab with persona",
        contentScriptFile : data.url("open-link-context.js"),
        items : persona_items,
        onMessage : function(mess){
            open_tab_in_persona(mess.url, mess.base, parseInt(mess.ctx));
        }
    });

    ctx_menu_same = cm.Menu({
        context : cm.SelectorContext("a[href]"),
        label : "Open link with persona",
        contentScriptFile : data.url("open-link-context.js"),
        items : persona_items_same,
        onMessage : function(mess){
            open_link_in_persona(mess.url, mess.base, parseInt(mess.ctx), my_tabs.active_tab());
        }
    });
};

exports.unload = function(){
    events.on("persona-changed", on_persona_changed);
};

exports.open_tab_in_persona = open_tab_in_persona;
