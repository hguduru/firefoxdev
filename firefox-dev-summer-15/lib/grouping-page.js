// grouping-page.js - page for assigning websites to groups
var page_mod = require("sdk/page-mod");
var data = require("sdk/self").data;
var self = require("sdk/self");
var events = require("./event_manager.js").global_events;
var tabs = require("sdk/tabs");
let { getFavicon } = require("sdk/places/favicon");

var persona_manager = require("./persona_manager.js").manager();
var conf_manager = require("./unconfigured-hosts.js").manager;
var persona_attributes = require("./persona_attributes.js");

var areyousure = require("./are-you-sure.js");

var historyquery = require("./history-query.js");

var pref_page_workers = [];

function onconfigurechange(event){
    var host = event.subject.host;
    var value = event.subject.configured;
    var unconfigured_hosts = null;
    pref_page_workers.forEach(function(worker){
        if(!unconfigured_hosts){
            unconfigured_hosts = conf_manager.unconfigured();
        }
        worker.port.emit("unconfigured-hosts", unconfigured_hosts);
    });
}

function on_persona_changed(event){
    var ctx = event.subject.target;
    if(event.subject.type == "added"){
        var add_obj = {
            "name" : ctx.name,
            "color" : ctx.color,
            "id" : ctx.id
        };
        pref_page_workers.forEach(function(worker){
            worker.port.emit("add-persona", ctx.overWire());
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
    } else if(event.subject.type == "color"){
        pref_page_workers.forEach(function(worker){
            worker.port.emit("color-persona", ctx.id, ctx.color);
        });
    } else if(event.subject.type == "policy"){
        var host_list = ctx.hostList();
        pref_page_workers.forEach(function(worker){
            worker.port.emit("host-change", ctx.id, host_list);
        });
    } else if(event.subject.type == "allow_tracking"){
        pref_page_workers.forEach(function(worker){
            worker.port.emit("change-tracking", ctx.id, ctx.allow_tracking);
        });
    }
}

function handleWorker(worker){
    pref_page_workers.push(worker);
    worker.on("detach", function(){
        var idx = pref_page_workers.indexOf(worker);
        pref_page_workers.splice(idx, 1);
    });
    worker.port.on("ask-info", function(tag, query){
        var history = new historyquery.WebHistoryBackend();
        var ans = history.queryInfo(query);
        worker.port.emit("favicon", tag, ans);
    });
    worker.port.on("tunnel-setup", function(){
        var unconfigured_hosts = conf_manager.unconfigured();
        worker.port.emit("defcolors", persona_attributes.def_colors());
        worker.port.emit("init-personas",
                         persona_manager.strippedList());
        worker.port.emit("unconfigured-hosts",
                         unconfigured_hosts);
    });

    worker.port.on("add-host", function(destPid, host){
        worker.port.emit("suppress");
        var destPersona = persona_manager.getPersona(destPid);
        destPersona.addHost(host);
        worker.port.emit("suppress");
    });

    worker.port.on("remove-host", function(srcPid, host){
        worker.port.emit("suppress");
        var srcPersona = persona_manager.getPersona(srcPid);
        srcPersona.removeHost(host);
        worker.port.emit("suppress");
    });

    worker.port.on("new-persona", function(host){
        // TODO: Check for existing name
        var newPersona = persona_manager.newPersona({
            "name" : "New persona " + (persona_manager.personaList().length)
        });
        if(host)
            newPersona.addHost(host);
    });
    worker.port.on("remove-host-unconfigured", function(host){
        worker.port.emit("suppress");
        conf_manager.setConfigured(host, true);
        worker.port.emit("suppress");
    });
    worker.port.on("add-host-unconfigured", function(host){
        worker.port.emit("suppress");
        conf_manager.setConfigured(host, false);
        worker.port.emit("suppress");
    });

    worker.port.on("query-remove", function(id){
        var apersona = persona_manager.getPersona(id);
        areyousure.show_are_you_sure(apersona);
    });

    worker.port.on("edit-name", function(id, newname){
        var apersona = persona_manager.getPersona(id);

        // TODO: check for name existing
        apersona.setName(newname);
    });
    worker.port.on("edit-color", function(id, newname){
        var apersona = persona_manager.getPersona(id);
        apersona.setColor(newname);
    });
    worker.port.on("edit-tracking", function(id, newvalue){
        var apersona = persona_manager.getPersona(id);
        apersona.setTracking(newvalue);
    });
}

exports.load = function(){
    events.on("persona-changed", on_persona_changed);
    events.on("persona-unconfigured-change", onconfigurechange);
};

exports.unload = function(){
    events.off("persona-changed", on_persona_changed);
    events.off("persona-unconfigured-change", onconfigurechange);
};

exports.openPersonaGrouping = function(){
    if(pref_page_workers.length != 0){
        pref_page_workers[0].tab.activate();
        pref_page_workers[0].tab.window.activate();
    } else {
        tabs.open({
            url : data.url("grouping-interface/grouping.html"),
            onReady : function(tab){
                var worker = tab.attach({
                    contentScriptFile : data.url("message_tunnel_cs.js")
                });
                handleWorker(worker);
            }});
    }
};
