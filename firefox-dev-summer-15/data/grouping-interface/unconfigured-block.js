function UnconfiguredBlock(){
    this.unconfigured_hosts = [];
    var thisobj = this;
    self.port.on("unconfigured-hosts", function(hostlist){
        thisobj.unconfigured_hosts = hostlist;
        thisobj.events.trigger("change", "hosts");
    });
};

UnconfiguredBlock.prototype = new BlockOracle();
UnconfiguredBlock.prototype.constructor = UnconfiguredBlock;

UnconfiguredBlock.prototype.title = function(){
    return "Uncategorized";
};

UnconfiguredBlock.prototype.selectColor = function(){
    return "none";
};

UnconfiguredBlock.prototype.hosts = function(){
    // todo: get from somewhere
    return this.unconfigured_hosts;
};

UnconfiguredBlock.prototype.id = function(){
    return -2;
};

UnconfiguredBlock.prototype.moveHost = function(obj){
    self.port.emit("add-host-unconfigured", obj.host);
    return true;
};
UnconfiguredBlock.prototype.moveFrom = function(obj){
    self.port.emit("remove-host-unconfigured", obj.host);
};

UnconfiguredBlock.prototype.hostInsertionKey = function(hostinfo){
    return 0;
};

UnconfiguredBlock.prototype.styleBlock = function(elem){
    elem.addClass("persona-unconfigured-block");
};
