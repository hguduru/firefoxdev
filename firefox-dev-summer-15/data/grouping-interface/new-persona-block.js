function NewPersonaBlock(){};

NewPersonaBlock.prototype = new BlockOracle();
NewPersonaBlock.prototype.constructor = NewPersonaBlock;

NewPersonaBlock.prototype.title = function(){
    return "New Persona";
};
NewPersonaBlock.prototype.id = function(){
    return -1;
};
NewPersonaBlock.prototype.moveHost = function(obj){
    self.port.emit("new-persona", obj.host);
    return false;
};
NewPersonaBlock.prototype.moveFrom = function(obj){
    // shouldn't happen
};
NewPersonaBlock.prototype.editable = false;
NewPersonaBlock.prototype.styleBlock = function(elem){
    var plusIcon = $("<i>", {
        "class" : "fa fa-plus persona-icon-bg"
    });
    elem.prepend(plusIcon);
    elem.append(plusIcon);

    elem.addClass("persona-new-persona-block");
    elem.addClass("icon-clickable");

    elem.click(function(){
        self.port.emit("new-persona");
    });
};

