// policy_matcher.js - allows specification and evaluation of policy for new
// requests. Decides which persona to put new requests on. 

// var persona = require("./persona.js");
var persona_manager = require("./persona_manager.js").manager();
var storage = require("./storage.js");
var logger = require("./logger.js");
var utils = require("./utils.js");
var alexa = require("./alexa-wrapper.js").alexa_module;
var locations = require("./locations.js");

var events = require("./event_manager.js").global_events;
var moment = require("moment");

var days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
var prop_list = [];
var root_policy = null;

var search_map = {};
var search_strict = {};
var make_prop = {};
var make_from_value = {};
var human_readable_map = {};
var parse_readable_map = {};
var make_key_map = {};
var delete_key_map = {};

function PolicyTree(init){
    if(init){
        this.root = init;
    } else {
        this.root = {};
    }
}

PolicyTree.prototype.save_data = function(){
    return this.root;
};

PolicyTree.prototype.remember = function(props, value, node){
    if(!node)
        node = this.root;
    if(props.length == 0){
        if("value" in node){
            node["value"].push(value);
        } else {
            node["value"] = [value];
        }
    } else {
        if(Array.isArray(props[0])){
            for(var i = 0; i < props[0].length; i++){
                var real_props = props.slice(1);
                real_props.unshift(props[0][i]);
                this.remember(real_props, value, node);
            }
        } else {
            var next = props.shift().make_next(node);
            this.remember(props, value, next);
        }
    }
};

PolicyTree.prototype.query = function(props){
    var nodes = [{ "node" : this.root,
                   "idx" : 0,
                   "path" : []}];
    var ans = [];
    while( nodes.length != 0 ){
        var cur_node = nodes.pop();
        if(cur_node.idx >= props.length){
            if("value" in cur_node.node){
                ans = ans.concat({
                    "persona" : cur_node.node.value,
                    "path" : cur_node.path
                });
            }
        } else {
            var next = props[cur_node.idx].get_next(cur_node.node);
            for(var j = next.length - 1; j >= 0; j--){
                nodes.push({ "node" : next[j].node,
                             "idx" : cur_node.idx + 1,
                             "path" : [{ "prop" : props[cur_node.idx],
                                         "priority" : next[j].priority }]
                             .concat(cur_node.path)});
            }
        }
    }
    var ans_sort_keys = ans.map(function(anode, i){
        var priority_accum = 0;
        for(var j = 0; j < anode.path.length; j++){
            priority_accum += anode.path[j].priority;
        }
        return { index : i,
                 value : priority_accum };
    });
    ans_sort_keys.sort(function(a, b){
        return a.value < b.value ? 1 : -1;
    });
    var sorted_ans = ans_sort_keys.map(function(e){
        return ans[e.index];
    });
    return sorted_ans;
};

PolicyTree.prototype.remove = function(props, value, node){
    if(!node)
        node = this.root;
    if(props.length == 0){
        if(!("value" in node)){
            console.warn("Error removing rule", props);
            return;
        }
        node["value"] = node["value"].filter(function(e){
            return e != value;
        });
        if(node["value"].length == 0){
            delete node["value"];
        }
    } else {
        if(Array.isArray(props[0])){
            for(var i = 0; i < props[0].length; i++){
                var real_props = props.slice(1);
                real_props.unshift(props[0][i]);
                this.remove(real_props, value, node);
            }
        } else {
            var prop = props.shift();
            var next = prop.get_next_strict(node);
            this.remove(props, value, next);
            prop.delete_next(node);
        }
    }
};

var prop_name_map = {};

function Property(name, opts){
    if(opts.search)
        search_map[name] = opts.search;
    if(opts.from_value)
        make_from_value[name] = opts.from_value;
    if(opts.make_prop)
        make_prop[name] = opts.make_prop;
    if(opts.make_key)
        make_key_map[name] = opts.make_key;
    if(opts.delete_key)
        delete_key_map[name] = opts.delete_key;
    if(opts.parse)
        parse_readable_map[name] = opts.parse;
    if(opts.human)
        human_readable_map[name] = opts.human;
    if(opts.search_strict)
        search_strict[name] = opts.search_strict;
    this.name = name;
    prop_list.push(this);
    prop_name_map[name] = this;
}

function getProperty(name){
    return prop_name_map[name];
};

Property.prototype.make_prop = function(val){
    var arg = this.name in make_prop ?
            make_prop[this.name](val) :
            val;
    return new PropertyValue(this.name, arg);
};

Property.prototype.make_prop_from_value = function(init){
    var arg = this.name in make_from_value ?
            make_from_value[this.name](init) :
            init;
    return new PropertyValue(this.name, arg);
};

Property.prototype.make_prop_from_human = function(human_read){
    var arg = this.name in parse_readable_map ?
            parse_readable_map[this.name](human_read) :
            human_read;
    return new PropertyValue(this.name, arg);
};

function PropertyValue(name, init){
    if(init === undefined || init === null){
        this.value = "default";
    } else {
        this.value = init;
    }
    this.name = name;
}

PropertyValue.prototype.key = function(){
    return this.value.toString();
};

PropertyValue.prototype.get_next = function(node){
    var ans = [];
    if(this.name in search_map){
        var a_next = search_map[this.name](node, this.value);
        if(a_next){
            if(Array.isArray(a_next)){
                for(var j = 0; j < a_next.length; j++){
                    ans.push({ "node" : a_next[j],
                               "default" : false });
                }
            } else {
                ans.push({ "node" : a_next,
                           "default" : false });
            }
        }
    } else {
        if(this.key() in node){
            ans.push( { "node" : node[ this.key() ],
                        "default" : this.key() == "default" });
        }
    }
    if("default" in node && this.value != "default"){
        ans.push({ "node" : node["default"],
                   "default" : true });
    }
    return ans.map(function(node_def){
        var priority = 0;
        var node = node_def["node"];
        if("node" in node){
            node = node["node"];
        }
        if("priority" in node_def["node"]){
            priority = node_def["node"]["priority"];
        } else {
            priority = node_def["default"] ? 0 : 1;
        }
        return {
            "node" : node,
            "priority" : priority
        };
    });
};

PropertyValue.prototype.make_next = function(node){
    if(this.name in make_key_map && this.value != "default"){
        return make_key_map[this.name](node, this.value);
    } else {
        var key = this.key();
        if(!(key in node)){
            node[key] = {};
        }
        return node[key];
    }
};

PropertyValue.prototype.get_next_strict = function(node){
    if(this.value == "default"){
        return node["default"];
    } else if(this.name in search_strict){
        return search_strict[this.name](node, this.value);
    } else {
        if(this.key() in node){
            return node[this.key()];
        } else {
            console.warn("Error deleting value, cannot find path "+node+" "+this.value);
        }
        return node["default"];
    }
};

PropertyValue.prototype.delete_next = function(node){
    if(this.name in delete_key_map && this.value != "default"){
        delete_key_map[this.name](node, this.value);
    } else {
        var key = this.key();
        if(Object.keys(node[key]).length == 0){
            delete node[key];
        }
    }
};

PropertyValue.prototype.to_human_readable = function(){
    if(this.value == "default"){
        return "";
    } else if(this.name in human_readable_map){
        return human_readable_map[this.name](this.value);
    } else {
        return this.value;
    }
};

function make_props(url){
    var ans = [];
    var the_host = url;
    for(var i = 0; i < prop_list.length; i++){
        ans.push( prop_list[i].make_prop(the_host) );
    }
    return ans;
}

function policy_matcher(url){
    var props = make_props(url);
    var ans = root_policy.query(props);

    var policy_match = ans || [];
    var personas_matched = policy_match.filter(function(e){
        if(Array.isArray(e.persona)){
            if(e.persona.length){
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    }).map(function(e){
        if(Array.isArray(e.persona)){
            return e.persona[0];
        } else {
            return e.persona;
        }
    });
    if(personas_matched !== null && personas_matched.length != 0){
        return [personas_matched[0]];
    } else {
        return [];
    }
}
exports.policy_matcher = policy_matcher;

function prop_array_reorder(arr){
    var ans = [];
    for(var i = 0; i < prop_list.length; i++){
        var arg = null;
        for(var j = 0; j < arr.length; j++){
            if(arr[j].name == prop_list[i].name){
                arg = arr[j];
            }
        }
        if(!arg){
            arg = prop_list[i].make_prop_from_value();
        }
        ans.push(arg);
    }
    return ans;
}

function prepare_props(opts){
    var ans = [];
    var non_default = false;
    for(var i = 0; i < prop_list.length; i++ ){
        var arg = null;
        if(prop_list[i].name in opts){
            var prop = opts[prop_list[i].name];
            if(Array.isArray(prop) && prop_list[i].name != "category"){
                arg = prop.map(function(e){
                    return prop_list[i].make_prop_from_value(e);
                });
                if(arg.length == 0){
                    arg = prop_list[i].make_prop_from_value();
                } else {
                    non_default = true;
                }
            } else {
                arg = prop_list[i].make_prop_from_value(prop);
                non_default = true;
            }
        } else {
            arg = prop_list[i].make_prop_from_value();
        }
        ans.push(arg);
    }
    if(non_default)
        return ans;
    else
        return false;
}

function remember_props(props, aPersona){
    if(!aPersona.policy)
        aPersona.policy = [];
    for(var i in aPersona.policy){
        if(JSON.stringify(aPersona.policy[i]) == JSON.stringify(props)){
            return;
        }
    }
    aPersona.policy.push(props.slice(0));
    root_policy.remember(props, aPersona.id);
}

function remember_policy(opts, aPersona){
    var props = prepare_props(opts);
    if(props)
        remember_props(props, aPersona);
}
exports.remember_policy = remember_policy;

function remove_mappings(aPersona){
    if(!aPersona.policy)
        return;
    for(var i = 0; i < aPersona.policy.length; i++){
        root_policy.remove(aPersona.policy[i].slice(0), aPersona.id);
    }
    aPersona.policy = [];
}

function set_policy(aPersona, policy_val, do_remember){
    if(do_remember)
        remove_mappings(aPersona);
    if(!policy_val)
        return;
    policy_val.forEach(function(aRule){
        var props = prepare_props(aRule);
        if(do_remember && props)
            remember_props(props, aPersona);
    });
}

function add_policy(aPersona, aRule){
    if(!aRule)
        return;
    var props = prepare_props(aRule);
    remember_props(props, aPersona);
}
exports.set_policy = set_policy;
exports.add_policy = add_policy;

function parse_rules(human_readable_str){
    var rules = human_readable_str.trim().split(";");
    var ans = rules.map(function(rule){
        var props = rule.split("and");
        return props.map(function(prop_field){
            if(prop_field == ""){
                return false;
            }
            prop_field = prop_field.trim();
            var key_val = prop_field.split("=");
            if(key_val.length != 2){
                throw "parse key value \""+key_val+"\"";
            }
            var prop_name = key_val[0].trim();
            var prop_val = key_val[1].trim();
            var theProperty = getProperty(prop_name);
            if(!theProperty){
                throw "parse property "+prop_name;
            }
            if(rule.indexOf(",") != -1){
                var prop_vals = prop_val.split(",").map(function(val_field){
                    var ans = theProperty.make_prop_from_human(val_field.trim());
                    if(!ans){
                        throw "parse value field "+val_field;
                    } else{
                        return ans;
                    }
                });
                return prop_vals;
            } else {
                return theProperty.make_prop_from_human(prop_val);
            }
        }).filter(function(a){
            return a;
        });
    }).filter(function(a){
        return a.length != 0;
    });
    return ans;

}

function human_readable_opts(opts){
    var props = prepare_props(opts);
    return human_readable_props(props);
}

function human_readable_props(props){
    var human = props.map(function(prop){
        if(Array.isArray(prop)){
            var prop_field = prop.map(function(p){
                return p.to_human_readable();
            }).filter(function(a){
                return a != "";
            }).join(",");
            if(prop_field != "")
                return prop[0].name + "=" + prop_field;
            else
                return "";
        } else {
            if(prop.value != "default"){
                return prop.name + "=" + prop.to_human_readable();
            } else {
                return "";
            }
        }
    }).filter(function(a){
        return a != "";
    });
    return human.join(" and ");
}

function human_readable_policy(policy){
    if(policy.length > 0){
        return policy.map(human_readable_props).filter(function(a){
            return a != "";
        }).join(";");
    } else {
        return "";
    }
}
exports.human_readable_policy = function(aPersona){
    if(!aPersona.policy)
        return "";
    return human_readable_policy(aPersona.policy);
};
exports.human_readable_opts = human_readable_opts;

function on_persona_changed(event){
    if(event.subject.type == "delete"){
        remove_mappings(event.subject.target);
    }
}

function on_location_deleted(event){
    var locid = event.subject.id;
    var persona_ids = persona.persona_ids();
    for(var i = 0; i < persona_ids.length; i++){
        var actx = persona.get_persona(persona_ids[i]);
        for(var p = 0; p < actx.policy.length; p++){
            var rule = actx.policy[p];
            var replacement = -1;
            for(var r = 0; r < rule.length; r++){
                if(rule[r].name == "location" && rule[r].value == event.subject.id){
                    replacement = r;
                }
            }
            if(replacement != -1){
                root_policy.remove(rule.slice(0), actx.id);
                rule[replacement].value = "default";
                actx.policy.splice(p, 1);
                root_policy.remember(rule.slice(0), actx.id);
            }
        }
    }
}

new Property("category", {
    "make_prop" : function(host){
        return alexa.get_category(host);
    },
    "search" : function(anode, cats){
        var ans = [];
        for(var acat_ind in cats){
            var acat = cats[acat_ind];
            if(acat[0] in anode){
                if(acat[1] in anode[acat[0]]){
                    ans.push( anode[acat[0]][acat[1]] );
                } else if("_default" in anode[acat[0]]) {
                    ans.push( anode[acat[0]]["_default"] );
                }
            }
        }
        return ans.map(function(node){
            return {
                "priority" : 1,
                "node" : node
            };
        });
    },
    "search_strict" : function(anode, acat){
        if(acat[0] in anode){
            if(acat[1] in anode[acat[0]]){
                return anode[acat[0]][acat[1]];
            } else if("_default" in anode[acat[0]]) {
                return anode[acat[0]]["_default"];
            }
        }
        return false;
    },
    "make_key" : function(anode, acat){
        if(!(acat[0] in anode)){
            anode[acat[0]] = {};
        }
        if(!(acat[1] in anode)){
            anode[acat[0]][acat[1]] = {};
        }
        return anode[acat[0]][acat[1]];
    },
    "delete_key" : function(anode, acat){
        if(acat[0] in anode){
            if(acat[1] in anode[acat[0]]){
                delete anode[acat[0]][acat[1]];
            }
        }
    }
});

new Property("host", {
    "search" : function(anode, adomname){
        var parsed_domname = utils.normalize_host(adomname);
        var full_domname = utils.normalize_host(adomname, true);
        var ans = [];
        if(full_domname in anode){
            ans.push({
                "node" : anode[full_domname],
                "priority" : 3
            });
        } else if(parsed_domname in anode){
            ans.push({
                "node" : anode[parsed_domname],
                "priority" : 2
            });
        }
        return ans;
    }
});

new Property("location", {
    "make_prop" : function(){
        var loc = locations.get_location();
        return loc ? loc.id : null;
    },
    "parse" : function(loc_name){
        var locs = locations.named_locations();
        for(var locid in locs){
            if(loc_name == locs[locid].name){
                return locs[locid].id;
            }
        }
        throw "No location named "+loc_name;
        return null;
    },
    "human" : function(loc){
        return locations.named_locations()[loc].name;
    }
});

function day_node_follow(node, aval, make){
    var day = aval.day;
    if(!(day in node) && make){
        node[day] = [];
    }
    var found = -1;
    if(day in node){
        for(var i = 0; i < node[day].length; i++){
            if(aval.start == node[day][i][0] &&
               aval.end == node[day][i][1]){
                found = i;
                break;
            }
        }
    }
    return found;
}

new Property("day", {
    make_prop : function(){ return moment(); },
    human : function(arange){
        var ans = days[arange.day];
        if(arange.start){
            ans += "@" + arange.start;
        }
        if(arange.end){
            ans += "-"+arange.end;
        }
        return ans;
    },
    parse : function(arange_str){
        var things = arange_str.split(/@|\-/g);
        var ans = { day : days.indexOf(things[0]) };
        if(ans.day == -1){
            throw "parse error day of the week "+things[0];
        }
        if(things.length > 1){
            if(things[1]){
                ans.start = things[1];
                var start = moment(ans.start, "hh:mma");
                if(!start)
                    throw "parse error start time "+ans.start;
            }
        } else if(things.length > 2){
            if(things[2]){
                ans.end = things[2];
                var end = moment(ans.end, "hh:mma");
                if(!end)
                    throw "parse error end time "+ans.end;
            }
        }
        return ans;
    },
    search : function(anode, adate){
        var the_day = adate.day();
        if(the_day in anode){
            for(var i = 0; i < anode[the_day].length; i++){
                var matches = true;
                if(anode[the_day][i][0]){
                    var start = moment(anode[the_day][i][0], "hh:mma");
                    matches &= start.isBefore(adate);
                }
                if(anode[the_day][i][1]){
                    var end = moment(anode[the_day][i][1], "hh:mma");
                    if(anode[the_day][i][1] == "12:00am")
                        end.add("24", "days");
                    matches &= end.isAfter(adate);
                }
                if( matches ){
                    return anode[the_day][i][2];
                }
            }
            return false;
        } else {
            return false;
        }
    },
    search_strict : function(node, aval){
        var found = day_node_follow(node, aval, false);
        if(found != -1){
            return node[aval.day][found][2];
        } else {
            return null;
        }
    },
    make_key : function(node, aval){
        var found = day_node_follow(node, aval, true);
        if(found == -1){
            node[aval.day].push([aval.start, aval.end, {}]);
            found = node[aval.day].length - 1;
        }
        return node[aval.day][found][2];
    },
    delete_key : function(node, aval){
        var found = day_node_follow(node, aval, false);
        if(found == -1){
            console.warn("Cannot find key");
        } else if(Object.keys(node[aval.day][found][2]).length == 0){
            node[aval.day].splice(found, 1);
            if(node[aval.day].length == 0){
                delete node[aval.day];
            }
        }
    }});

exports.load = function(){
    events.on("persona-changed", on_persona_changed);
    events.on("privbrowse-location-delete", on_location_deleted);
    var policy_map = storage.read_json("policy_map2.json", function(){
        return {};
    });
    // root_policy = policy_map;
    root_policy = new PolicyTree(storage.read_json("policy_map3.json", function(){
        return {};
    }));

    var migrate_policy = false;
    if(Object.keys(policy_map) != 0){
        storage.del_migrate("policy_map2.json");
        migrate_policy = true;
    }
    var persona_ids = persona_manager.personaList();
    for(var i = 0; i < persona_ids.length; i++){
        var aPersona = persona_manager.getPersona(persona_ids[i]);
        if(!aPersona.policy){
            aPersona.policy = [];
        }
        for(var p = 0; p < aPersona.policy.length; p++){
            aPersona.policy[p] = aPersona.policy[p].map(function(e){
                if(Array.isArray(e)){
                    return e.map(function(i){
                        return new PropertyValue(i.name, i.value);
                    });
                } else {
                    return new PropertyValue(e.name, e.value);
                }
            });
            if(migrate_policy){
                aPersona.policy = [];
            }
        }
    }
};

function save_to_file(){
    storage.save_json("policy_map3.json", root_policy.save_data());
}

exports.save_to_file = save_to_file;

exports.unload = function(){
    events.off("persona-changed", on_persona_changed);
    events.off("privbrowse-location-delete", on_location_deleted);
    save_to_file();
};
