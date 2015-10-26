// persona_manager.js - singleton manager for loading and storing personas. 
var file_name = "addon_policies.json";

function PersonaManager(){
    this.personas = {};
    this.persona_id_max = 0;
    return this;
}

// maybe not a singleton later...
var manager_singleton = new PersonaManager();
exports.manager = function(){
    return manager_singleton;
};

var events = require("./event_manager.js").global_events;
var storage = require("./storage.js");
var Persona = require("./persona.js").Persona;

PersonaManager.prototype.load = function(){
    var diskpersonas = storage.read_json(file_name, function(){
        return {
            0 : {
                name : "default",
                deletable : false,
                color : "none",
                id : 0
            },
            1 : {
                "name" : "Private Sites",
                "deletable" : false,
                "color" : "none",
                id : 1,
                "allow_tracking" : true
            }
        };
    });
    for(var key in diskpersonas){
        this.personas[key] = new Persona(diskpersonas[key], true);
    }
    this.persona_id_max = Math.max(
        Math.max.apply(null, Object.keys(this.personas)), 0) + 1;
};

PersonaManager.prototype.save = function(){
    storage.save_json(file_name, this.personas);
};

PersonaManager.prototype.getPersona = function(id){
    var ans = this.personas[id];
    // if(!ans){
    //     ans = this.personas[default_persona];
    // }
    return ans;
};

PersonaManager.prototype.newPersona = function(opts){
    opts.id = this.persona_id_max++;
    var ans = new Persona(opts);
    this.personas[ans.id] = ans;
    events.emit("persona-changed", { subject : {
        type : "added",
        target : ans
    }});
    return ans;
};

PersonaManager.prototype.deletePersona = function(id){
    var per = this.getPersona(id);
    events.emit("persona-changed", { subject : {
        "type" : "delete",
        "target" : per
    }});
    delete this.personas[id];
};

PersonaManager.prototype.personaList = function(){
    var ids = Object.keys(this.personas);
    var ans = [];
    for(var i = 0; i < ids.length; i++){
        ans.push(ids[i]);
    }
    return ans;
};

PersonaManager.prototype.personaObjList = function(){
    var thisobj = this;
    return this.personaList().map(function(elem){
        var p = thisobj.getPersona(elem);
        return p;
    });
};

PersonaManager.prototype.strippedList = function(){
    var thisobj = this;
    var name_ids = this.personaList().map(function(elem){
        var p = thisobj.getPersona(elem);
        return p.overWire();
    });
    return name_ids;
};

PersonaManager.prototype.personaNames = function(){
    var thisobj = this;
    return this.personaList().map(function(id){
        var per = thisobj.getPersona(id);
        return per.name;
    });
};
