// navbar_button.js - old implementation of button in navbar
var my_tabs = require("./my_tabs.js");
var timers = require("sdk/timers");

var tabs = require("sdk/tabs");
var system = require("sdk/system");
var ui = require("./ui.js");
var utils = require("./utils.js");
var new_context_panel = require("./new_context_panel.js");
var storage = require("./storage.js");
var logger = require("./logger.js");
var pref_page = require("./pref_page.js");
var conf_manager = require("./unconfigured-hosts.js").manager;

var navbar_panel = require("./navbar_panel.js");

var persona_manager = require("./persona_manager.js").manager();
var persona_choser = require("./persona_choser.js").choser();

var tbb_id = "persona-tbb-btn";
var tb_widget = null;

var events = require("./event_manager.js").global_events;
var { Cc, Ci, Cu, Cr, components } = require("chrome");
var data = require("sdk/self").data;

var io_svc = Cc["@mozilla.org/network/io-service;1"]
        .getService(Ci.nsIIOService);
var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
        .getService(Ci.nsIStyleSheetService);

var tbburi = io_svc.newURI( data.url("tbb_chrome.css"), null, null );
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var tbb_par_id = "nav-bar";
var tbb_before_id = "home-button";

function on_tab_persona_changed(event){
    if(my_tabs.is_active(event.subject.tab))
        update_window(event.subject.tab.ownerDocument.defaultView);
}

function onconfigurechange(event){
    update_window(null);
}

function update_window(win){
    var cur_tab = my_tabs.active_tab(win);
    var cur_persona_id = persona_choser.currentPersona(cur_tab);
    var cur_persona = persona_manager.getPersona(cur_persona_id);
    var doc = cur_tab.ownerDocument;
    var urlbaricon = doc.querySelector("#persona_urlbaricon");
    if(urlbaricon)
        urlbaricon.textContent = "persona:"+cur_persona.name;
    var navbar_btn = doc.querySelector("#persona-tbb");
    if(navbar_btn){
        var ids = persona_manager.personaList();
        var tbb = doc.querySelector("#persona-tbb");
        var label = window_title(cur_persona);
        tbb.setAttribute("label", label);
    }
}

function window_title(cur_persona){
    var label = cur_persona.name;
    return label;
}

function on_persona_changed(event){
    var aCtx = event.subject.target;
    if(event.subject.type == "added"){

    } else if(event.subject.type == "delete"){

    } else if(event.subject.type == "name"){
        my_tabs.windows().forEach(function(win){
            var cur_persona_id = persona_choser.currentPersona(
                my_tabs.active_tab(win));
            var cur_persona = persona_manager.getPersona(cur_persona_id);
            if(cur_persona.id == aCtx.id){
                var tbb = win.document.querySelector("#persona-tbb");
                var urlbaricon = win.document.querySelector("#persona_urlbaricon");
                if(tbb){
                    tbb.setAttribute("label", window_title(aCtx));
                }
                if(urlbaricon)
                    urlbaricon.textContent = "persona:"+aCtx.name;
            }
            var node = win.document.querySelector("#persona_menu"+aCtx.id);
            if(node)
                node.setAttribute("label", aCtx.name);
        });
    }
}

function make_menu_item(par, options, on_click, before){
    var tag = "menuitem";
    var menu_item = par.ownerDocument.createElementNS(XUL_NS, tag);
    for(var o in options){
        menu_item.setAttribute(o, options[o]);
    }
    if(on_click){
        menu_item.addEventListener("command", function(evt){
            on_click(evt);
        });
    }
    if(before)
        par.insertBefore(menu_item, before);
    else
        par.appendChild(menu_item);
    return menu_item;
}

function make_persona_menu_item(par, actx, checked, before){
    var id = actx.id;
    var name = actx.name;
    var opts = {
        "id" : "persona_menu" + id,
        "label" : name,
        "type" : "radio",
        "tooltiptext" : "switch to " + name + " persona",
        "name" : "persona_group"
    };
    if(checked){
        opts["checked"] = true;
    }
    return make_menu_item(par, opts, function(event){
        var per = persona_manager.getPersona(id);
        ui.set_persona(id);
        var nhost = utils.normalize_host(my_tabs.active_url());
        if(!per.soft_accepts[nhost]){
            ui.show_ask_panel(my_tabs.active_tab(), {
                "ask_again" : true
            });
        }
    }, before);
}

function make_tbb(win){
    var doc = win.document;
    var menu_button = doc.createElementNS(XUL_NS, "toolbarbutton");
    var cur_persona_id =
            persona_choser.currentPersona(my_tabs.active_tab(win));
    var cur_persona = persona_manager.getPersona(cur_persona_id);
    menu_button.setAttribute("id", "persona-tbb");
    menu_button.setAttribute("type", "menu");
    var navbar_classes = "toolbarbutton-1 chromeclass-toolbar-additional";
    if(system.version < 29){
        navbar_classes += " ";
    }
    menu_button.setAttribute("class", navbar_classes);
    menu_button.setAttribute("label", cur_persona.name);
    menu_button.setAttribute("type", "menu");
    menu_button.onclick = function(){
        navbar_panel.show();
    };
    return menu_button;
}

function make_url_bar_icon(win){
    var doc = win.document;
    var $ = function(str) { return doc.getElementById(str); };
    if(!utils.should_save_data(win)){
        return;
    }

    var active_tab = my_tabs.active_tab(win);
    var aPersona_id = persona_choser.currentPersona(active_tab);
    var aPersona = persona_manager.getPersona(aPersona_id);
    var window_nodes = win.document.getElementsByTagName("window");

    if(!$("nav-bar") || !$(tbb_before_id) ||
       (window_nodes.length &&
        (window_nodes[0].getAttribute("chromehidden")
         .indexOf("menubar") != -1))){
        var urlbar_icon = doc.querySelector("#urlbar-icons");
        var icon = doc.createElement("label");
        icon.textContent = "persona:"+aPersona.name;
        icon.id = "persona_urlbaricon";
        urlbar_icon.appendChild(icon);
    }

    win.addEventListener("unload", remove_url_bar_event, false);

    var tbb_item = make_tbb(win);

    var customizeMode = ($("nav-bar") || $("addon-bar")).getAttribute("place");
    if(customizeMode){
        // toolbar is in customize mode and cannot add
        console.warn("Cannot move navbar button because in customize mode");
    }

    ($("navigator-toolbox") || $("mail-toolbox")).palette.appendChild(tbb_item);

    var navbar = doc.getElementById(tbb_par_id);
    var home_btn = doc.getElementById(tbb_before_id);
    if(navbar && home_btn ) {
        navbar.insertItem("persona-tbb", home_btn, null, false);
    }

    win.addEventListener("aftercustomization", customize_listener, false);
}

function customize_listener(e){
    var win = e.target.ownerDocument.defaultView;
    var tbb = win.document.querySelector("#persona-tbb");
    var par = "";
    var before = "";
    if(tbb){
        par = tbb.parentNode.getAttribute("id");
        before = (tbb.nextSibling || "") && tbb.nextSibling.getAttribute("id").replace(/^wrapper-/i, "");
    } else {
        par =  "";
        before = "";
    }
    tbb_par_id = par;
    tbb_before_id = before;
}

function remove_url_bar_icon(win){
    var doc = win.document;
    win.removeEventListener("aftercustomization", customize_listener);
    if(!doc){
        return;
    }
    var urlbaricon = doc.querySelector("#persona_urlbaricon");
    if(urlbaricon)
        urlbaricon.parentNode.removeChild(urlbaricon);
    var tbb_menu = doc.querySelector("#persona-tbb");
    if(tbb_menu){
        tbb_menu.parentNode.removeChild(tbb_menu);
    }
}

function remove_url_bar_event(event){
    remove_url_bar_icon(event.target);
}

function update_all_wins(){
    var wins = my_tabs.windows();
    for(var i = 0; i < wins.length; i++){
        update_window(wins[i]);
    }
}

exports.update_all_wins = update_all_wins;

exports.get_navbar_id = function(){
    return "persona-tbb";
};

exports.load = function(options){
    sss.loadAndRegisterSheet(tbburi, sss.USER_SHEET);
    events.on("persona-changed", on_persona_changed);
    events.on("tab-persona-changed", on_tab_persona_changed);
    events.on("persona-unconfigured-change", onconfigurechange);
    tabs.on("activate", function(tab){
        timers.setTimeout(function(){
            update_window(null);
        }, 50);

    });
    my_tabs.watch_windows(make_url_bar_icon);

    tbb_par_id = storage.read_json("tbb_parent_id", function(){
        return "nav-bar";
    });
    tbb_before_id = storage.read_json("tbb_before_id", function(){
        return "home-button";
    });
    navbar_panel.load();
};

function save_data(){
    storage.save_json("tbb_parent_id", tbb_par_id);
    storage.save_json("tbb_before_id", tbb_before_id);
};

exports.save_data = save_data;

exports.unload = function(){
    sss.unregisterSheet(tbburi, sss.USER_SHEET);
    events.off("persona-changed", on_persona_changed);
    events.off("tab-persona-changed", on_tab_persona_changed);
    events.off("persona-unconfigured-change", onconfigurechange);
    my_tabs.windows().forEach(function(win){
        win.removeEventListener("unload", remove_url_bar_event);
        remove_url_bar_icon(win);
    });
    navbar_panel.unload();
    save_data();
};

function set_tool_tip(tooltip, win){
    return;
    if(!win)
        win = my_tabs.active_window();
    var tbb = win.document.getElementById("persona-tbb");
    tbb.setAttribute("tooltiptext", tooltip);
}

exports.set_tool_tip = set_tool_tip;
