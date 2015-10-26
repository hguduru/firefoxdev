var data = require("sdk/self").data;
var events = require("./event_manager.js").global_events;
var persona_manager = require("./persona_manager.js").manager();
var persona_choser = require("./persona_choser.js").choser();
var grouping_page = require("./grouping-page.js");
var my_panel = require("./my_panel.js");

var thepanel = null;

function onconfigurechange(event){
    console.log("configurechange-notify");
    var unconfigured_hosts = event.subject.numunconfigured;
    var curPersona = persona_choser.currentPersona();
    thepanel.show();
    thepanel.messager.send_message("cur-persona", curPersona);
}

function onPersonaChange(event){
    var ctx = event.subject.target;
    if(event.subject.type == "added"){
        var add_obj = {
            "name" : ctx.name,
            "color" : ctx.color,
            "id" : ctx.id
        };
        thepanel.messager.send_message("add-persona", ctx.overWire());
    } else if(event.subject.type == "name"){
        thepanel.messager.send_message("change-name", ctx.id, ctx.name);
    } else if(event.subject.type == "delete"){
        thepanel.messager.send_message("remove-persona", ctx.id);
    } else if(event.subject.type == "color"){
        thepanel.messager.send_message("color-persona", ctx.id, ctx.color);
    } else if(event.subject.type == "policy"){
        var host_list = ctx.hostList();
        thepanel.messager.send_message("host-change", ctx.id, host_list);
    } else if(event.subject.type == "allow_tracking"){
        thepanel.messager.send_message("change-tracking", ctx.id, ctx.allow_tracking);
    }
}

function onload(){
    events.on("persona-unconfigured-item", onconfigurechange);
    events.on("persona-changed", onPersonaChange);
    thepanel = new my_panel.XulPanel({
        "src" : data.url("notification-popup/popup.html"),
        "id" : "navbar_popup",
        "width" : 250,
        "on_attach" : function(pobj){
            pobj.messager.send_message("init-personas",
                                       persona_manager.strippedList());
        }
    });
    thepanel.messager.on_message("resize", function(a, h){
        thepanel.resize_height(h, a);
    });
    thepanel.messager.on_message("hide-me", function(){
        thepanel.hide();
    });
    thepanel.messager.on_message("open-prefs", function(){
        grouping_page.openPersonaGrouping();
        thepanel.hide();
    });
}

function onunload(){
    events.off("persona-changed", onPersonaChange);
    events.off("persona-unconfigured-item", onconfigurechange);
}

exports.load = onload;
exports.unload = onunload;
