function PersonaBlock(apersona, per_man){
    this.apersona = apersona;
    var thisobj = this;
    this.events = new EventManager();
    per_man.events.on("change", function(apersona, type){
        if(thisobj.apersona.id == apersona.id){
            thisobj.events.trigger("change", type);
        }
    });
    per_man.events.on("remove", function(apersona, type){
        if(thisobj.apersona.id == apersona.id){
            thisobj.events.trigger("remove", type);
        }
    });
};

PersonaBlock.prototype = new BlockOracle();
PersonaBlock.prototype.constuctor = PersonaBlock;

PersonaBlock.prototype.editable = true;

PersonaBlock.prototype.color = function(){
    return this.apersona.color == "none" || !this.apersona.color ?
        "#cccccc" :
        this.apersona.color;
};

PersonaBlock.prototype.selectColor = function(){
    return this.apersona.color == "none" || !this.apersona.color ?
        "none" :
        this.apersona.color;
};

PersonaBlock.prototype.title = function(){
    return this.apersona.name;
};

PersonaBlock.prototype.hosts = function(){
    return this.apersona.hosts;
};

PersonaBlock.prototype.id = function(){
    return this.apersona.id;
};

PersonaBlock.prototype.moveHost = function(obj){
    self.port.emit("add-host", this.id(), obj.host);
    return true;
};

PersonaBlock.prototype.moveFrom = function(obj){
    self.port.emit("remove-host", this.id(), obj.host);
};

PersonaBlock.prototype.editTitle = function(newtitle){
    self.port.emit("edit-name", this.id(), newtitle);
};

PersonaBlock.prototype.editColor = function(newcolor){
    self.port.emit("edit-color", this.id(), newcolor);
};

PersonaBlock.prototype.queryRemove = function(){
    self.port.emit("query-remove", this.id());
};

PersonaBlock.prototype.styleBlock = function(elem){
    elem.addClass("persona-persona-block");
};

PersonaBlock.prototype.hostInsertionKey = function(hostinfo){
    return hostinfo.inlastweek;
};

PersonaBlock.prototype.editTracking = function(avalue){
    self.port.emit("edit-tracking", this.id(), avalue);
};

PersonaBlock.prototype.hasTracking = function(){
    return !this.apersona.allow_tracking;
};

PersonaBlock.prototype.infoText = function(infoElem, info){
    if (info.inlastweek == 1) {
        var textAnswer = "You visited " + info.host + " " +
            info.inlastweek + " time in the last week"; }
        else {
            var textAnswer = "You visited " + info.host + " " +
            info.inlastweek + " times in the last week";
        }
    var infotextspan = $("<span>", {
        "text" : textAnswer
    });
    
    
    infoElem.append(infotextspan);
};
