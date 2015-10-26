function EventManager(){
    this.handlers = {};
}

EventManager.prototype.on = function(name, cb){
    if(!(name in this.handlers)){
        this.handlers[name] = [];
    }
    this.handlers[name].push(cb);
};

EventManager.prototype.off = function(name, cb){
    if(name in this.handlers){
        var ind = this.handlers[name].indexOf(cb);
        if(ind != -1){
            this.handlers[name].splice(ind, 1);
        }
    }
};

EventManager.prototype.trigger = function(name){
    if(name in this.handlers){
        var args = [].slice.call(arguments, 1);
        for(var i = 0; i < this.handlers[name].length; i++){
            this.handlers[name][i].apply(this, args);
        }
    }
};

EventManager.prototype.add_handlers = function(obj){
    for(var key in obj){
        this.on(key, obj[key]);
    }
};
