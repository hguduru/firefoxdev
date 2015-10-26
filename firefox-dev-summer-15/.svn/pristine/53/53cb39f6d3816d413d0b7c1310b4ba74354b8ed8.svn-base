// ui_element.js - wrapper around some UI elements
var events = require("./event_manager.js").global_events;
var persona_manager = require("./persona_manager.js").manager();
var my_panel = require("./my_panel.js");

var UIElement = (function(){
    return function(options){
        this.thepanel = null;
        this.src = options.src;
        this.id = options.id;

        this.use_persona_manager = options.use_persona_manager || False;
        this.onattach = options.onattach || function(pan){};
        this.onshow = options.onshow || function(pan){};
        this.onloadhook = options.onloadhook || function(pan){};
        this.onunloadhook = options.onunloadhook || function(pan){};
        this.commands = options.commands || {};

        var thisobj = this;
        var default_commands = {
            "resize" : function(animate, h, win){
                thisobj.thepanel.resize_height(h, animate);
            },
            "hide-me" : function() {
                thisobj.thepanel.hide();
            }
        };

        for(key in default_commands){
            if(!(key in this.commands)){
                this.commands[key] = default_commands[key];
            }
        }
    };
})();

UIElement.prototype.hide = function(){
    this.thepanel.hide();
};

UIElement.prototype.load = function(){
    if(this.use_persona_manager){
        var thisobj = this;
        this.on_persona_changed = function(event){
            thisobj.onPersonaChanged(event);
        };
        events.on("persona-changed", this.on_persona_changed);
    }
    var thisobj = this;
    var onattach = function(pan){
        if(thisobj.use_persona_manager){
            var messager = pan.messager;
            var name_ids = persona_manager.strippedList();
            messager.send_message("init-personas", name_ids);
        }

        thisobj.onattach(pan);
    };

    this.thepanel = new my_panel.XulPanel({
        "src" : this.src,
        "id" : this.id,
        "on_attach" : onattach
    });

    for(var key in this.commands){
        this.thepanel.messager.on_message(key, this.commands[key]);
    }

    this.onloadhook(this.thepanel);
};

UIElement.prototype.unload = function(){
    if(this.use_persona_manager){
        events.off("persona-changed", this.on_persona_changed);
    }
    this.onunloadhook(this.thepanel);
};

UIElement.prototype.show = function(){
    var args = [];
    for(var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    if(this.onshow.apply(null, [this.thepanel].concat(args))){
        this.thepanel.show();
    }
};

UIElement.prototype.onPersonaChanged = function(event){
    var aCtx = event.subject.target;
    var messager = this.thepanel.messager;
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
};

UIElement.prototype.messager = function(){
    return this.thepanel.messager;
};

exports.UIElement = UIElement;
