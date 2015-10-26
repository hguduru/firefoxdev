// navbar-widget.js - widget in the navigation bar with icon and persona name
var tabs = require("sdk/tabs");
var timers = require("sdk/timers");
const widgets = require("sdk/widget");
const data = require("sdk/self").data;

var my_tabs = require("./my_tabs.js");
var events = require("./event_manager.js").global_events;
var persona_manager = require("./persona_manager.js").manager();
var persona_choser = require("./persona_choser.js").choser();
var navbar_panel = require("./navbar_panel.js");
var unconfigured = require("./unconfigured-hosts.js").manager;

function navbar_id_base(){
    return "persona-tbb-123";
}

function get_navbar_id(win){
    win = win || my_tabs.active_window();
    var query = win.document.getElementsByTagName("toolbaritem");
    var reg = /persona-tbb-123/;
    for(var i = 0; i < query.length; i++) {
        var id = query[i].getAttribute("id");
        if(id.match(reg)){
            return id;
        }
    }
    return navbar_id_base();
}

var widget;

function NavbarWidget(){
    var onclick = function(){
        navbar_panel.show();
    };
    this.widget = widgets.Widget({
        id : navbar_id_base(),
        width : 48,
        label : "Persona Plugin",
        contentURL : data.url("navbar-widget.html"),
        onClick : onclick
    });
    this.widget.port.on("resize-width", (function(w){
        console.log("resize-width", w);
        this.widget.width = w;
    }).bind(this));
    this.update();
}

NavbarWidget.prototype.update = function(){
    this.widget.port.emit("change-label", this.labelText());
    var n = unconfigured.unconfigured().length;
    this.updateNum(n);
};

NavbarWidget.prototype.updateNum = function(n){
    this.widget.port.emit("change-num", n);
};

NavbarWidget.prototype.labelText = function(){
    var cur_persona_id = persona_choser.currentPersona();
    var cur_persona = persona_manager.getPersona(cur_persona_id);
    return cur_persona.name;
};


function update_all_wins(){
    widget.update();
}

function on_persona_changed(event){
    widget.update();
}

function on_tab_persona_changed(event){
    widget.update();
}

function onconfigurechange(event){
    var unconfigured_hosts = event.subject.numunconfigured;
    widget.updateNum(unconfigured_hosts);
}

function updateTimeout(){
    timers.setTimeout(function(){
        widget.update();
    }, 50);
}

function onload(){
    widget = new NavbarWidget();
    events.on("persona-changed", on_persona_changed);
    events.on("tab-persona-changed", on_tab_persona_changed);
    events.on("persona-unconfigured-change", onconfigurechange);
    tabs.on("activate", updateTimeout);
}

function save_data(){

}

function unload(){
    events.off("persona-changed", on_persona_changed);
    events.off("tab-persona-changed", on_tab_persona_changed);
    events.off("persona-unconfigured-change", onconfigurechange);
    save_data();
}

function setToolTip(){

}

exports.update_all_wins = update_all_wins;
exports.get_navbar_id = get_navbar_id;
exports.load = onload;
exports.unload = unload;
exports.save_data = save_data;
exports.set_tool_tip = setToolTip;
