function HistoryBlock(){
    this.hosts = [];
    var thisobj = this;
    self.port.on("history-hosts", function(recentHistory) {
        thisobj.hosts = recentHistory;
        thisobj.events.trigger("changed", "history");
    });
};


HistoryBlock.prototype.editable = false;
HistoryBlock.prototype = new BlockOracle();
HistoryBlock.prototype.constructor = HistoryBlock;

HistoryBlock.prototype.title = function(){
    return "Browsing history";
};
HistoryBlock.prototype.color = function(){
    return "#ffffff";
};

HistoryBlock.prototype.id = function(){
    return -4;
};
HistoryBlock.prototype.moveHost = function(obj){
};
HistoryBlock.prototype.moveFrom = function(obj){

};

HistoryBlock.prototype.elem = function() {
    return this.element;
}

//Hosts should be pre-loaded.
HistoryBlock.prototype.hosts = function() {

};

HistoryBlock.prototype.styleBlock = function(elem){
    elem.addClass("persona-history-block");
};

HistoryBlock.prototype.registerManager = function(manager){
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
