// history-view.js - mediator between controllers and different runtimes (e.g.,
// chrome, firefox)

function HistoryView(controller, runtime){
    this.controller = controller;
    this.runtime = runtime;
}

HistoryView.prototype.attach = function(port){
    var thisobj = this;
    this.port = port;
    port.on("close-me", function(uids){
        thisobj.controller.removeItems(uids, thisobj.reinit(port));
    });
    port.on("ask-favicon", function(url, uid){
        thisobj.runtime.askFavicon(url, function(iconurl){
            port.emit("favicon", iconurl, uid);
        });
    });
    port.on("ask-domain", function(url, uid){
        thisobj.runtime.askDomain(url, function(ans){
            port.emit("domain", ans, uid);
        });
    });
    port.on("older", function(){
        thisobj.controller.moveOlder(thisobj.reinit(port));
    });
    port.on("newer", function(){
        thisobj.controller.moveNewer(thisobj.reinit(port));
    });
    port.on("dump", function(uid){
        thisobj.runtime.dump(uid);
    });
    this.controller.init(50, this.reinit(port));
};

HistoryView.prototype.reinit = function(port){
    return function(){
        var results = this.controller.results();
        var hasNewer = this.controller.hasNewer();
        var hasOlder = this.controller.hasOlder();
        port.emit("init", results, hasNewer, hasOlder);
    }.bind(this);
};

if(typeof(exports) !== "undefined")
    exports.HistoryView = HistoryView;
