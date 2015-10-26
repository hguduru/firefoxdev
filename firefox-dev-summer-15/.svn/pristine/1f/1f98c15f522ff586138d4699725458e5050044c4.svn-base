function TrashBlock(){};

TrashBlock.prototype = new BlockOracle();
TrashBlock.prototype.constructor = TrashBlock;

TrashBlock.prototype.title = function(){
    return "Remove host";
};
TrashBlock.prototype.selectColor = function(){
    return "none";
};
TrashBlock.prototype.id = function(){
    return -3;
};
TrashBlock.prototype.moveHost = function(obj){
    return false;
};
TrashBlock.prototype.moveFrom = function(obj){};

TrashBlock.prototype.styleBlock = function(elem, response){
    if(response){
        if(response.type == "end"){
            elem.addClass("hidden");
        } else {
            elem.removeClass("hidden");
        }
    } else {
        var plusIcon = $("<i>", {
            "class" : "fa fa-minus persona-icon-bg"
        });
        elem.append(plusIcon);
        elem.addClass("persona-trash-block");
        elem.addClass("hidden");
    }
};

TrashBlock.prototype.registerManager = function(manager){
    var thisobj = this;
    manager.events.on("startdrag", function(){
        thisobj.events.trigger("styleme", {
            "type" : "start"
        });
    });
    manager.events.on("enddrag", function(){
        thisobj.events.trigger("styleme", {
            "type" : "end"
        });
    });
};
