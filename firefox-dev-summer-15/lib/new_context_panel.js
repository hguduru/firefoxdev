// new_context_panel.js - panel shown to users when the create or edit a
// persona. 
var data = require("sdk/self").data;
var panels = require("sdk/panel");
var events = require("./event_manager.js").global_events;

var persona_attributes = require("./persona_attributes.js");

var persona_manager = require("./persona_manager.js").manager();

var my_panel = require("./my_panel.js");
var my_tabs = require("./my_tabs.js");
var tab_color = require("./tab-color.js");
var locations = require("./locations.js");
var ui = require("./ui.js");
var alexa = require("./alexa-wrapper.js").alexa_module;
var utils = require("./utils.js");

var cb_map = {};
var show_num = 1;
var thepanel = null;

var show_are_you_sure = require("./are-you-sure.js").show_are_you_sure;

function on_new_context(info) {
    var cur_loc_rename = false;
    info.policy.forEach(function(rule){
        if("location" in rule && rule["location"] == -1){
            cur_loc_rename = true;
        }
    });
    if(cur_loc_rename){
        locations.generate_name(function(name){
            var cur_id = locations.assign_name_to_cur_loc(name);
            info.policy.forEach(function(rule){
                if("location" in rule && rule["location"] == -1){
                    rule["location"] = cur_id;
                }
            });
            on_new_context(info);
        });
        return;
    }
    var per_arg = info.purpose == "change" ?
            persona_manager.getPersona(info.id) :
            null;
    var valid = persona_attributes.validate(info, per_arg);
    if(valid.length != 0){
        thepanel.messager.send_message("error", valid);
        return;
    }
    thepanel.hide();
    var ctx = null;
    if(info.purpose == "new"){
        ctx = persona_manager.newPersona(info);
    } else if(info.purpose == "change") {
        ctx = persona_manager.getPersona(info.id);
        persona_attributes.apply(info, ctx);
    }
    if(ctx && "cb_id" in info && info.cb_id in cb_map){
        cb_map[info.cb_id](ctx);
        delete cb_map[info.cb_id];
    }
    if(info.switch_to && info.purpose == "new"){
        ui.set_persona(ctx.id);
        var nhost = utils.normalize_host(my_tabs.active_url());
        if(!ctx.soft_accepts[nhost]){
            ui.show_ask_panel(my_tabs.active_tab(), {
                "ask_again" : true
            });
        }
    }
}

function new_context_panel_init(ctx, pre_populate, callback){
    var win = my_tabs.active_window();
    var messager = thepanel.messager;
    var given_pre_pop = true;
    if(!pre_populate){
        given_pre_pop = false;
        pre_populate = {};
    }
    thepanel.show();

    var sending = {};
    if(!ctx){
        sending = persona_attributes.default_vals(pre_populate);
        sending["purpose"] = "new";
        if(callback)
            sending["cb_id"] = show_num;
        sending["switch_to"] = given_pre_pop;
    } else {
        sending = persona_attributes.prepopulate(ctx);
        sending["purpose"] = "change";
        if(callback)
            sending["cb_id"] = show_num;
        sending["id"] = ctx.id;
        sending["switch_to"] = false;
    }
    var cur_host = utils.normalize_host(my_tabs.active_url());
    if(cur_host.indexOf("about:") == 0){
        cur_host = null;
    }
    sending["cur_host"] = cur_host;
    
    messager.send_message("show", sending);

    if(callback){
        cb_map[show_num] = callback;
        show_num += 1;
    }
}

function on_added_location(event){
    thepanel.messager.send_message("added-location", event.subject);
}
function on_deleted_location(event){
    thepanel.messager.send_message("deleted-location", event.subject);
}
function on_renamed_location(event){
    thepanel.messager.send_message("renamed-location", event.subject);
}

exports.new_context_panel_init = new_context_panel_init;

exports.load = function(){
    events.on("privbrowse-added-location", on_added_location);
    events.on("privbrowse-location-delete", on_deleted_location);
    events.on("privbrowse-location-rename", on_renamed_location);
    thepanel = new my_panel.XulPanel({
        "src" : data.url("new-context.html"),
        "id" : "new-context-persona",
        "on_attach" : function(pobj){
            pobj.messager.send_message("init-cats", alexa.all_categories());
            pobj.messager.send_message("init-dialog",
                                       persona_attributes.list(),
                                       persona_attributes.def_colors(),
                                       locations.named_locations());
        }
    });
    thepanel.messager.on_message("resize", function(a, h){
        thepanel.resize_height(h, a);
    });
    thepanel.messager.on_message( "new-context", function(info){
        on_new_context(info);
    });
    thepanel.messager.on_message("delete-ctx", function(id){
        var aPersona = persona_manager.getPersona(id);
        show_are_you_sure();
    });
    thepanel.messager.on_message("hide-me", function(){
        tab_color.refresh_color(my_tabs.active_tab());
        thepanel.hide();
    });
    thepanel.messager.on_message("change-tab-color", function(color){
        tab_color.change_tab_color(my_tabs.active_tab(), color);
    });
    thepanel.messager.on_message("revert-tab-color", function(){
        tab_color.refresh_color(my_tabs.active_tab());
    });
    thepanel.resize_width(650);
};

exports.unload = function(){
    events.off("privbrowse-added-location", on_added_location);
    events.off("privbrowse-location-delete", on_deleted_location);
    events.off("privbrowse-location-rename", on_renamed_location);
};
