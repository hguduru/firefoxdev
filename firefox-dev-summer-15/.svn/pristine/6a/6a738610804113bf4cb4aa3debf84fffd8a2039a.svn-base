function PersonaManager(){
    this.personas = {};
    this.cur_persona = -1;
    this.events = new EventManager();

    var this_obj = this;
    self.port.on("change-name", function(id, new_name){
        if(!(id in this_obj.personas)){
            return;
        }
        this_obj.personas[id].name = new_name;
        this_obj.call_on_change(id, "name");
    });
    self.port.on("color-persona", function(id, new_color){
        if(!(id in this_obj.personas)){
            return;
        }
        this_obj.personas[id].color = new_color;
        this_obj.call_on_change(id, "color");
    });
    self.port.on("change-tracking", function(id, value){
        if(!(id in this_obj.personas)){
            return;
        }
        this_obj.personas[id].allow_tracking = value;
        this_obj.call_on_change(id, "allow_tracking");
    });
    self.port.on("remove-persona", function(id){
        this_obj.remove_persona(id);
    });
    self.port.on("add-persona", function(aPersona){
        this_obj.add_persona(aPersona);
    });
    self.port.on("init-personas", function(aPersona){
        this_obj.add_persona(aPersona);
    });
    self.port.on("current-persona", function(id){
        this_obj.change_current_persona(id);
    });
    self.port.on("host-change", function(id, hostlist){
        if(!(id in this_obj.personas)){
            return;
        }
        this_obj.personas[id].hosts = hostlist;
        this_obj.call_on_change(id, "hosts");
    });
}

PersonaManager.prototype.call_on_change = function(anId, type){
    if(!(anId in this.personas)){
        return;
    }
    this.events.trigger("change", this.personas[anId], type);
};

PersonaManager.prototype.get_persona = function(anId){
    if(!(anId in this.personas)){
        return null;
    }
    return this.personas[anId];
};

PersonaManager.prototype.remove_persona = function(anId){
    if(!(anId in this.personas)){
        return;
    }
    var aPer = this.personas[anId];
    this.events.trigger("remove", aPer);
    delete this.personas[anId];
};

PersonaManager.prototype.add_persona = function(aPersona){
    if(Array.isArray(aPersona)){
        this.add_personas(aPersona);
    } else {
        this.personas[aPersona.id] = aPersona;
        this.events.trigger("add", aPersona);
    }
};

PersonaManager.prototype.add_personas = function(personas){
    for(var j = 0; j < personas.length; j++){
        this.add_persona(personas[j]);
    }
};

PersonaManager.prototype.current_persona = function(){
    if(this.cur_persona in this.personas){
        return this.personas[this.cur_persona];
    } else {
        return null;
    }
};

PersonaManager.prototype.get_personas = function(){
    var this_obj = this;
    return Object.keys(this.personas).map(function(id){
        return this_obj.personas[id];
    });
};

PersonaManager.prototype.change_current_persona = function(id){
    this.cur_persona = id;
    this.events.trigger("current", this.current_persona());
};
