// navbar_panel.js - panel popup in the navigation bar
var data = require("sdk/self").data;
var events = require("./event_manager.js").global_events;
var my_panel = require("./my_panel.js");

var new_context_panel = require("./new_context_panel.js");
var choose_persona_panel = require("./choose_persona_panel.js").choose_persona_panel;
var pref_page = require("./pref_page.js");

var ui = require("./ui.js");
var utils = require("./utils.js");
var my_tabs = require("./my_tabs.js");
var logger = require("./logger.js");
var group_page = require("./grouping-page.js");

var persona_choser = require("./persona_choser.js").choser();
var persona_manager = require("./persona_manager.js").manager();

var thepanel = null;

var commands = {
    "change-persona" : function(id){
        var per = persona_manager.getPersona(id);
        ui.set_persona(id);
        logger.add_persona_config({
            "type" : "manual-change",
            "to" : id,
            "url" : my_tabs.active_url()
        });
        var nhost = utils.normalize_host(my_tabs.active_url());
        if(!per.soft_accepts[nhost]){
            ui.show_ask_panel(my_tabs.active_tab(), {
                "ask_again" : true
            }, "switch");
        }
    },
    "new-mode" : function(){
        new_context_panel.new_context_panel_init();
    },
    "settings" : function(){
        pref_page.open_page();
    },
    "assign" : function(){
        choose_persona_panel.show({
            "ask_again" : false,
            "switch_to" : true
        });
    },
    "hide-me" : function() {
        thepanel.hide();
    },
    "grouping" : function(){
        group_page.openPersonaGrouping();
    }
};

function on_persona_changed(event){
    var aCtx = event.subject.target;
    var messager = thepanel.messager;
    if(event.subject.type == "added"){
        var add_obj = {
            "name" : aCtx.name,
            "color" : aCtx.color,
            "id" : aCtx.id
        };
        messager.send_message("add-persona", add_obj);
    } else if(event.subject.type == "name"){
        messager.send_message("change-name", aCtx.id, aCtx.name);
    } else if(event.subject.type == "delete"){
        messager.send_message("remove-persona", aCtx.id);
    } else if(event.subject.type == "color"){
        messager.send_message("color-persona", aCtx.id, aCtx.color);
    }
}

function onconfiguredchange(event){
    var aCtx = event.subject.target;
    var messager = thepanel.messager;

    messager.send_message("num-unconfigured",
                          event.subject.numunconfigured);
}

exports.load = function(){

    thepanel = new my_panel.XulPanel({
        "src" : data.url("navbar_panel.html"),
        "id" : "navbar_panel",
        "on_attach" : function(pobj){
            var name_ids = persona_manager.strippedList();
            pobj.messager.send_message("init-personas", name_ids);
            var cur_persona = persona_choser.currentPersona();
            pobj.messager.send_message("current-persona", cur_persona);
        }
    });
    thepanel.messager.on_message("resize", function(animate, h, win){
        thepanel.resize_height(h, animate);
    });
    thepanel.resize_width(175);
    for(var key in commands){
        thepanel.messager.on_message(key, commands[key]);
    }
    events.on("persona-changed", on_persona_changed);
    events.on("persona-unconfigured-change", onconfiguredchange);
};

exports.show = function(){
    var cur_persona = persona_choser.currentPersona();
    thepanel.messager.send_message("current-persona", cur_persona);
    thepanel.messager.send_message("show");
    thepanel.show();
};

exports.unload = function(){
    events.off("persona-changed", on_persona_changed);
    events.off("persona-unconfigured-change", onconfiguredchange);
};
