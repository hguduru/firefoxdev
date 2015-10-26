// persona.js - Main persona object implementation
var events = require("./event_manager.js").global_events;
var persona_attributes = require("./persona_attributes.js");
var cookie_interface = require("./cookie_interface.js");
var policy = require("./policy_matcher.js");

function Persona(opts, fromDisk){
    this.ctx_opts = {};
    this.ctxs = {};
    this.id = opts.id;
    this.rule = [];
    this.policy = [];
    this.soft_accepts = opts.soft_accepts || {};
    this.conflict_priority = opts.conflict_priority || 0;
    persona_attributes.apply(opts, this, fromDisk);
    return this;
}

Persona.prototype.addNewContext = function(id){
    var anon_ctx = new cookie_interface.Context(this.ctx_opts);
    this.ctxs[id] = anon_ctx;
    anon_ctx.parentId = this.id;
    return id;
};

Persona.prototype.getContext = function(id){
    id = id ? id : 0;
    if(!this.ctxs[id]){
        this.addNewContext(id);
    }
    var ans = this.ctxs[id];
    return ans;
};

Persona.prototype.removeContext = function(id){
    delete this.ctxs[id];
};

Persona.prototype.setName = function(name){
    var old = this.name;
    this.name = name;
    events.emit("persona-changed", { subject : {
        "type" : "name",
        "target" : this,
        "old" : old
    }});
};

Persona.prototype.setColor = function(new_color){
    this.color = new_color;
    events.emit("persona-changed", { subject : {
        "type" : "color",
        "target" : this,
        "color" : new_color
    }});
};

Persona.prototype.setPolicy = function(val){
    policy.set_policy(this, val, true);
    events.emit("persona-changed", {
        subject : {
            "type" : "policy",
            "target" : this
        }
    });
};

Persona.prototype.getId = function(){
    return this.id;
};

Persona.prototype.addSoft = function(host){
    if(!this.soft_accepts){
        this.soft_accepts = {};
    }
    this.soft_accepts[host] = true;
};

Persona.prototype.isSoftAccept = function(host){
    if(!this.soft_accepts){
        return false;
    }
    return host in this.soft_accepts;
};

function getTypePolicyNode(node){
    if(Array.isArray(node)){
        var nodetypes = node.map(getTypePolicyNode);
        if(nodetypes.length){
            var first = nodetypes[0];
            if(nodetypes.every(function(a){
                return a == first;
            })){
                return first;
            } else {
                // TODO: should raise error?
                return "";
            }
        } else {
            // TODO: should raise error?
            return "";
        }
    } else {
        return node["name"];
    }
}

function getValuePolicyNode(node){
    if(Array.isArray(node)){
        return node.map(getValuePolicyNode).map(function(a){
            return a[0];
        });
    } else {
        return [node.value];
    }
}

function getHostsForRule(arule){
    var hosts = [];
    var hasNonHostRules = false;
    for(var i = 0; i < arule.length; i++) {
        var nodetype = getTypePolicyNode(arule[i]);
        var nodevalues = getValuePolicyNode(arule[i]);
        if(nodetype == "host"){
            hosts = nodevalues;
        } else if(nodevalues.some(function(val){
            return val != "default";
        })) {
            hasNonHostRules = true;
        }
    }
    return hasNonHostRules ? [] : hosts;
}

Persona.prototype.hostList = function(){
    var ans = [];
    for(var i = 0; i < this.policy.length; i++) {
        var hosts = getHostsForRule(this.policy[i]);
        ans = ans.concat(hosts);
    }
    return ans;
};

function createRuleForHosts(hosts){
    if(hosts.length == 0){
        return null;
    }
    var ans = [
        {
            "value" : "default",
            "name" : "category"
        },
        hosts.map(function(h){
            return {
                "value" : h,
                "name" : "host"
            };
        }),
        {
            "value": "default",
            "name": "location"
        },
        {
            "value": "default",
            "name": "day"
        }
    ];

    return ans;
};

function clone(obj){
    // TODO: Change this hack
    return JSON.parse(JSON.stringify(obj));
}

function translateDiskRuleToPolicy(arule){
    var ans = {};
    for(var i = 0; i < arule.length; i++) {
        var nodetype = getTypePolicyNode(arule[i]);
        var nodevalues = getValuePolicyNode(arule[i]);
        if(nodevalues.length == 1){
            ans[nodetype] = nodevalues[0];
        } else {
            ans[nodetype] = nodevalues;
        }
    }
    return ans;
};

Persona.prototype.removeHost = function(host){
    var ans = [];
    for(var i = 0; i < this.policy.length; i++) {
        var oldRule = this.policy[i];
        var hosts = getHostsForRule(oldRule);
        var newRule;
        var findHost = hosts.indexOf(host);
        if(hosts.indexOf(host) != -1){
            hosts.splice(findHost, 1);
            newRule = createRuleForHosts(hosts);
            if(!newRule)
                continue;
        } else {
            newRule = clone(oldRule);
        }
        var newRuleTranslated = translateDiskRuleToPolicy(newRule);
        ans.push(newRuleTranslated);
    }
    this.setPolicy(ans);
};

Persona.prototype.addHost = function(host){
    policy.add_policy(this, {
        "host" : host
    });
    events.emit("persona-changed", {
        subject : {
            "type" : "policy",
            "target" : this
        }
    });
};

Persona.prototype.setTracking = function(tracking){
    this.allow_tracking = tracking;
    if(tracking){
        this.third_party_policy = "all";
        this.cookie_duration = "expire";
        this.share_policy = "none";
    } else {
        this.third_party_policy = "all";
        this.cookie_duration = "expire";
        this.share_policy = "all";
    }
    events.emit("persona-changed", {
        subject : {
            "type" : "allow_tracking",
            "target" : this
        }
    });
};

Persona.prototype.overWire = function(){
    return {
        "name" : this.name,
        "id" : this.id,
        "color" : this.color,
        "hosts" : this.hostList(),
        "allow_tracking" : this.allow_tracking
    };
};

exports.Persona = Persona;
