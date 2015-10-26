// pref_page.js - addon configuration page.
var page_mod = require("sdk/page-mod");

var data = require("sdk/self").data;
var self = require("sdk/self");
var persona_manager = require("./persona_manager.js").manager();
var persona_choser = require("./persona_choser.js").choser();
var logger = require("./logger.js");
var ui = require("./ui.js");
var events = require("./event_manager.js").global_events;
var locations = require("./locations.js");
var new_context_panel = require("./new_context_panel.js");
var grouping = require("./grouping-page.js");
var tabs = require("sdk/tabs");
var bug_reporter = require("./bug-reporter.js");

var pref_page_workers = [];

function on_location_rename(event){
    pref_page_workers.forEach(function(w){
        w.port.emit("location-rename", event.subject);
    });
}

function on_persona_changed(event){
    var ctx = event.subject.target;
    if(event.subject.type == "added"){
        pref_page_workers.forEach(function(worker){
            worker.port.emit("add-persona", ctx);
        });
    } else if(event.subject.type == "name"){
        pref_page_workers.forEach(function(worker){
            worker.port.emit("change-name", ctx.id, ctx.name);
        });
    } else if(event.subject.type == "delete"){
        pref_page_workers.forEach(function(worker){
            worker.port.emit("remove-persona", ctx.id);
            // worker.tab.reload();
        });
    }
}

function on_location_changed(event){
    pref_page_workers.forEach(function(w){
        w.port.emit("location-name-changed", event.subject);
    });
}

function on_location_added(event){
    pref_page_workers.forEach(function(w){
        w.port.emit("added-location", event.subject);
    });
}

function handle_worker(worker){
    var loc_update = function(coords){
        worker.port.emit("update-coord", coords);
    };
    var wat_id = locations.watch_coords(loc_update);
    pref_page_workers.push(worker);
    worker.on("detach", function(){
        var idx = pref_page_workers.indexOf(worker);
        pref_page_workers.splice(idx, 1);
        locations.unwatch(wat_id);
    });
    worker.port.on("temp-on", function(){
        locations.temp_on();
    });
    worker.port.on("remove-location", function(id){
        locations.remove(id);

    });
    worker.port.on("tunnel-setup", function(){
        var def_pref_id = persona_choser.defaultPersona();

        worker.port.emit("init-personas", persona_manager.strippedList());
        worker.port.emit( "populate",
                          {
                              "defPersona" : def_pref_id,
                              "ask" : persona_choser.askForPersona(),
                              "use_location" : locations.use_location(),
                              "named_locations" : locations.named_locations(),
                              "cur_coords" : locations.get_coords(),
                              "cur_loc" : locations.get_location(),
                              "dont_ask_in_conflict" : persona_choser.dontAskInConflict(),
                              "default_selected" :
                              persona_choser.defaultSelectedFlag(),
                              "addon_version" : self.version
                          });
    });
    worker.port.on("generate_name", function(coords, id){
        locations.generate_name(function(name){
            worker.port.emit("name-generated", id, name);
        }, coords);
    });
    worker.port.on("default-changed", function(id){
        persona_choser.defaultPersona(id);
    });
    worker.port.on("modify-persona", function(id){
        var ctx = persona_manager.getPersona(id);
        if(!ctx)
            return;
        new_context_panel.new_context_panel_init(ctx);
    });
    worker.port.on("new-persona", function(){
        new_context_panel.new_context_panel_init();
    });
    worker.port.on("ask-for-persona", function(val){
        persona_choser.askForPersona(val);
    });
    worker.port.on("use-location", function(val){
        locations.use_location(val);
    });
    var historyFrontend = require("./log-history-frontend.js");
    worker.port.on("remove-log", function(){
        historyFrontend.openLogViewing();
    });
    worker.port.on("rename-location", function(id, name){
        locations.rename(id, name);
    });
    worker.port.on("change-rad", function(id, val){
        locations.change_radius(id, val);
    });
    worker.port.on("move-location", function(id, obj){
        locations.move(id, obj);
    });
    worker.port.on("default_selected", function(val){
        persona_choser.setDefaultSelectedFlag(val);
    });
    worker.port.on("report-bug", function(desc, config_info){
        bug_reporter.do_debug_log(desc, config_info, function(resp){
            if(resp.status == 200){
                try {
                    var resp_obj = JSON.parse(resp.responseText);
                    if(!resp_obj.submittted){
                        console.warn("bug_report_error", resp.responseText);
                    }
                    worker.port.emit("bug-submitted", resp_obj.submitted);
                } catch(e){
                    console.warn("bug_report_error",
                                 resp.responseText, e.toString());
                    worker.port.emit("bug-submitted", false);
                }
            } else {
                console.warn("bug_report_error", resp.responseText);
                worker.port.emit("bug-submitted", false);
            }
        });
    });
    worker.port.on("add-location", function(coords, title){
        var id = locations.assign_name_to_loc(coords, title);
        worker.port.emit("location-has-been-added", id);
    });
    worker.port.on("dont-ask-in-conflict", function(val){
        persona_choser.dontAskInConflict(val);
    });
    worker.port.on("grouping-interface", function(){
        grouping.openPersonaGrouping();
    });
}

exports.open_page = function(){
    if(pref_page_workers.length != 0){
        pref_page_workers[0].tab.activate();
        pref_page_workers[0].tab.window.activate();
    } else {
        tabs.open({
            url : data.url("preferences.html"),
            onReady : function(tab){
                var worker = tab.attach({
                    contentScriptFile : data.url("message_tunnel_cs.js")
                });
                handle_worker(worker);
            }});
    }
};

exports.load = function(){
    events.on("persona-changed", on_persona_changed);
    events.on("named-location-changed", on_location_changed);
    events.on("privbrowse-added-location", on_location_added);
    events.on("privbrowse-location-rename", on_location_rename);
};

exports.unload = function(){
    events.off("persona-changed", on_persona_changed);
    events.off("named-location-changed", on_location_changed);
    events.off("privbrowse-added-location", on_location_added);
    events.off("privbrowse-location-rename", on_location_rename);
};
