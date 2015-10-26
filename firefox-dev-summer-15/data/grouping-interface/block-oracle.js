function BlockOracle(){
    this.events = new EventManager();
}

BlockOracle.prototype.color = function(){
    return "#ffffff";
};

BlockOracle.prototype.id = function(){
    return undefined;
};

BlockOracle.prototype.selectColor = function(){
    return this.color();
};

BlockOracle.prototype.hosts = function(){
    return [];
};

BlockOracle.prototype.title = function(){
    return "Unnamed, replaceme";
};

BlockOracle.prototype.styleBlock = function(elem){
    return;
};

BlockOracle.prototype.hostInsertionKey = function(hostinfo){
    return 0;
};

BlockOracle.prototype.registerManager = function(manager){};

BlockOracle.prototype.editable = false;

BlockOracle.prototype.infoText = function(infoElem, info){  
    if (info.inlastweek == 1) {  
    var textAnswer = "You have visited " + info.host + " " +
            info.inlastweek + " time in the last week";
        }
        else {
            var textAnswer = "You have visited " + info.host + " " +
            info.inlastweek + " times in the last week";
        }
    var infotextspan = $("<span>", {
        "text" : textAnswer
    });
    infoElem.append(infotextspan);
};
