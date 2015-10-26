// tab-color.js - modifies the color of tabs
var { Cc, Ci, Cu, Cr, components } = require("chrome");
var my_tabs = require("./my_tabs.js");
var persona_manager = require("./persona_manager.js").manager();
var persona_choser = require("./persona_choser.js").choser();
var events = require("./event_manager.js").global_events;
var tabs = require("sdk/tabs");
var system = require("sdk/system");

var runtime = Cc["@mozilla.org/xre/app-info;1"]
        .getService(Ci.nsIXULRuntime);
var osString = runtime.OS;

function restore_colors(xul_tab){
    change_tab_color(xul_tab, null, true);
}

function set_tab_color_mac(elem, color, restore){
    if(restore || color == null || color == "none"){
        elem.style.removeProperty("background-image");
        return;
    }
    if(system.version < 29){
        var prop = '-moz-linear-gradient(rgba(255,255,255,.2),'+color+'),-moz-linear-gradient('+color+','+ color +')';
        elem.style.setProperty("background-image", prop, "important");
    } else {
        
    }
}

function set_tab_color_win(elem, color, restore){
    if(restore || color == null || color == "none"){
        elem.style.removeProperty("background-image");
        return;
    }
    if(system.version < 29){
        var prop = '-moz-linear-gradient(rgba(255,255,255,0.4),'+color+'), -moz-linear-gradient('+color+','+ color +')';

        if(elem.selected){
            elem.style.setProperty("background-image", prop, "important");
        } else {
            prop = "-moz-linear-gradient(to top, rgba(26,26,26,.5) 1px, transparent 1px), linear-gradient(transparent, rgba(114, 114, 114, 0.1) 1px, rgba(81,81,81,0.2) 80%, rgba(0,0,0,0.2))," + prop;
            elem.style.setProperty("background-image", prop, "important");
        }
    } else {

    }
}

function set_navbar_color_prop(doc, color, restore){
    if(system.version < 29){
        if(restore || color == null){
            if(osString != "Darwin"){
                doc.querySelector("#nav-bar").style.removeProperty("background-image");
            } else {
                doc.querySelector("#nav-bar").style.removeProperty("background-color");
                doc.querySelector("#nav-bar").style.removeProperty("margin-top");
            }
            return;
        }
        if(osString != "Darwin"){
            var prop = '-moz-linear-gradient('+color+','+ color +'),-moz-linear-gradient(rgba(255,255,255,0.4),'+color+')';
            doc.querySelector("#nav-bar").style.setProperty("background-image", prop, "important");
        } else {
            doc.querySelector("#nav-bar").style.setProperty("background-color", color, "important");
            doc.querySelector("#nav-bar").style.setProperty("margin-top", "-1px", "important");
        }
    } else {

    }
}

function change_tab_color(xul_tab, color, restore){
    var doc = xul_tab.ownerDocument;
    if(!doc.getAnonymousNodes){
        return;
    }
    var tab_stacks = doc.getAnonymousNodes(xul_tab)[0];
    if(system.version < 29){
        if(osString != "Darwin" ){
            set_tab_color_win(xul_tab, color, restore);
        } else {
            if(tab_stacks){
                var tab_bg = tab_stacks.querySelector(".tab-background");
                if(tab_bg){
                    var tab_bg_start = tab_bg.querySelector(".tab-background-start");
                    if(tab_bg_start)
                        set_tab_color_mac(tab_bg_start, color, restore);
                    var tab_bg_mid = tab_bg.querySelector(".tab-background-middle");
                    if(tab_bg_mid)
                        set_tab_color_mac(tab_bg_mid, color, restore);
                    var tab_bg_end = tab_bg.querySelector(".tab-background-end");
                    if(tab_bg_end)
                        set_tab_color_mac(tab_bg_end, color, restore);
                }
            }
        }
    } else {
        if(tab_stacks){
            var label = tab_stacks.querySelector("label");
            if(restore || color == null || color == "none"){
                label.style.removeProperty("text-shadow");
            } else {
                var prop = "";
                var template = "0px 0px ";
                var times = 8;
                for(var i = 0; i < times; i ++ ){
                    prop += template + (times / (3 * (i + 1) )) + "em " + color;
                    if(i != times - 1) prop += ", ";
                }
                label.style.setProperty("text-shadow", prop);
            };
        }
    }
    if(my_tabs.is_active(xul_tab)){
        set_navbar_color_prop(doc, color, restore);
    }
}

function on_color_changed(ctx, new_color){
    var open_tabs = my_tabs.tabs();
    for(var j = 0; j < open_tabs.length; j++){
        var tab = open_tabs[j];
        var curpersonaid = persona_choser.currentPersona(tab);
        if(curpersonaid == ctx.id){
            change_tab_color(tab, new_color);
        }
    }
}

function on_persona_changed(event){
    var aCtx = event.subject.target;
    if(event.subject.type == "color"){
        on_color_changed(aCtx, event.subject.color);
    } else if(event.subject.type == "delete"){
        var default_persona_id = persona_choser.defaultPersona();
        var default_persona = persona_manager.getPersona(default_persona_id);
        var open_tabs = my_tabs.tabs();
        for(var j = 0; j < open_tabs.length; j++){
            var tab = open_tabs[j];
            var tab_per = persona_choser.currentPersona(tab);
            if(aCtx.id == tab_per){
                change_tab_color(tab, default_persona.color);
            }
        }
    }
}

function on_tab_change_persona(event){
    var tab = event.subject.tab;
    var aPersona_id = persona_choser.currentPersona(tab);
    var aPersona = persona_manager.getPersona(aPersona_id);
    console.log("change-tab-color", aPersona_id, aPersona.color);
    change_tab_color(tab, aPersona.color);
}

function refresh_color(tab){
    var aPersona_id = persona_choser.currentPersona(tab);
    var aPersona = persona_manager.getPersona(aPersona_id);
    change_tab_color(tab, aPersona.color);
};
exports.refresh_color = refresh_color;
exports.change_tab_color = change_tab_color;

var prev_tab = null;

function on_tab_activate(tab){
    var xul_tab = my_tabs.active_tab();
    refresh_color(xul_tab);
    refresh_color(prev_tab);
    prev_tab = xul_tab;
}

exports.load = function(){
    events.on("persona-changed", on_persona_changed);
    events.on("tab-persona-changed", on_tab_change_persona);
    prev_tab = my_tabs.active_tab();
    var xul_tabs = my_tabs.tabs();
    for(var i = 0; i < xul_tabs.length; i++){
        var aPersona_id = persona_choser.currentPersona(xul_tabs[i]);
        var aPersona = persona_manager.getPersona(aPersona_id);
        change_tab_color(xul_tabs[i], aPersona.color);
    }
    tabs.on("activate", on_tab_activate);
};

exports.unload = function(){
    events.off("persona-changed", on_persona_changed);
    events.off("tab-persona-changed", on_tab_change_persona);
    var xul_tabs = my_tabs.tabs();
    for(var i = 0; i < xul_tabs.length; i++){
        restore_colors(xul_tabs[i]);
    }
};
