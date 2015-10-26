// unconfigured-hosts.js - manages what happens when an unconfigured host is
// detected

var events = require("./event_manager.js").global_events;

var storage = require("./storage.js");

function HostConfigurationManager(){
    this.hosts = {};
    this.unconfigured_count = 0;
}

HostConfigurationManager.prototype.load = function(){
    var hosts = storage.read_json("unconfigured-hosts", function(){
        return {};
    });
    this.hosts = hosts;
    this.unconfigured_count = this.unconfigured().length;

    events.emit("persona-unconfigured-change", {
        "subject" : {
            "numunconfigured" : this.unconfigured_count
        }
    });
    console.log("events persona-unconfigured-change", this.unconfigured_count);
    var thisobj = this;
    this._handler = this.handleEvent.bind(this);
    events.on("persona-unconfigured-item", this._handler, false);
};

HostConfigurationManager.prototype.handleEvent = function(event){
    var host = event.subject.host;
    var full_host = event.subject.full_host;
    var visited = event.subject.visited;
    if(!visited){
        this.makeRecord(host);
    }
};

HostConfigurationManager.prototype.unload = function(){
    storage.save_json("unconfigured-hosts", this.hosts);
    events.off("persona-unconfigured-item", this._handler);
};

HostConfigurationManager.prototype.setConfigured = function(host,
                                                            value){
    var changed = value != this.hosts[host].configured;
    this.hosts[host].configured = value;
    if(changed){
        if(value){
            this.unconfigured_count--;
        } else {
            this.unconfigured_count++;
        }
    }
    events.emit("persona-unconfigured-change", {
        "subject" : {
            "host" : host,
            "configured" : value,
            // "numunconfigured" : this.unconfigured_count
            "numunconfigured" : this.unconfigured().length
        }
    });
};

HostConfigurationManager.prototype.unconfigured = function(){
    var thisobj = this;
    var ans = Object.keys(this.hosts).filter(function(e){
        return !thisobj.hosts[e].configured;
    });
    return ans;
};

HostConfigurationManager.prototype.isUnconfigured = function(host){
    if(host in this.hosts){
        return !this.hosts[host].configured;
    } else {
        return false;
    }
};

HostConfigurationManager.prototype.makeRecord = function(host){
    var newRecord = {
        "host" : host,
        "configured" : false
    };
    this.hosts[host] = newRecord;
    this.unconfigured_count++;
    events.emit("persona-unconfigured-change", {
        "subject" : {
            "host" : host,
            "configured" : false,
            // "numunconfigured" : this.unconfigured_count
            "numunconfigured" : this.unconfigured().length
        }
    });
};

var manager = new HostConfigurationManager();
exports.manager = manager;
