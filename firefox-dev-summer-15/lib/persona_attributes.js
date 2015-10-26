// persona_attributes.js - deals with arbitrary attributes for personas (e.g.
// color, name, ...). Can add/remove/edit/store attributes here.
var policy = require("./policy_matcher.js");
var logger = require("./logger.js");
var persona_manager = require("./persona_manager.js").manager();

var attributes = (function(){
    var list = [];
    return {
        add : function(opts){
            list.push(opts);
        },
        list : function(){
            return list.map(function(e){
                return e.name;
            });
        },
        default_vals : function(opts){
            var ans = {};
            list.forEach(function(attr){
                if(attr.name in opts){
                    ans[attr.name] = opts[attr.name];
                } else if("default" in attr) {
                    if(typeof attr["default"] === "function"){
                        ans[attr.name] = attr["default"]();
                    } else {
                        ans[attr.name] = attr["default"];
                    }
                }
            });
            return ans;
        },
        prepopulate : function(ctx){
            var ans = {};
            list.forEach(function(attr){
                ans[attr.name] = attr.get_val.apply(ctx, []);
            });
            return ans;
        },
        validate : function(opts, aPersona){
            return list.map(function(attr){
                if("validate" in attr){
                    var valid = attr.validate(opts[attr.name], aPersona);
                    if(valid){
                        return {
                            "text" : valid,
                            "name" : attr.name
                        };
                    }
                }
                return false;
            }).filter(function(e){
                return e;
            });
        },
        apply : function(opts, aPersona, fromDisk){
            var log_string = {
                "opts" : opts,
                "aPersona" : aPersona.id,
                "type" : "attributes"
            };
            logger.add_persona_config(log_string);
            for( var i = 0; i < list.length; i++ ){
                var attr = list[i];
                if(attr.name in opts){
                    if("apply" in attr){
                        attr["apply"].apply(aPersona,
                                            [ opts[attr.name], fromDisk ]);
                    } else {
                        aPersona[attr.name] = opts[attr.name];
                    }
                } else {
                    if(typeof (attr["default"]) === "function"){
                        var def = attr["default"]();
                        aPersona[attr.name] = def;
                    } else {
                        attr["apply"].apply(aPersona, [attr["default"]]);
                    }
                }
            }
        }
    };
}());

attributes.add({
    "name" : "name",
    "default": "",
    "validate" : function(name, aPersona){
        var real_name = name.trim();
        if(real_name == ""){
            return "Empty persona name";
        }
        var personas = persona_manager.personaObjList();
        var foundother = false;
        for(var i = 0; i < personas.length; i++){
            if (personas[i].name == name && !aPersona) {
                foundother = true;
                break;
            }
            if (aPersona &&
                personas[i].name == name &&
                aPersona.id != personas[i].id){
                foundother = true;
                break;
            }
        }

        if(foundother){
            return "A persona with that name already exists";
        }
        return false;
    },
    "apply" : function(name, fromDisk){
        if(fromDisk){
            this.name = name;
            return;
        }

        var val = name.trim();
        var id = this.id;
        // var already_exists = function(aname){
        //     var ind = persona_manager.personaList().indexOf(aname);
        //     if(ind == -1){
        //         return false;
        //     } else {
        //         return persona.get_persona_by_name(aname).id != id;
        //     }
        // };
        // while(already_exists(val)){
        //     console.warn("persona exists", val);
        //     var m = val.match(/\d+$/);
        //     if(m){
        //         val = val + (parseInt(m[0]) + 1);
        //     } else {
        //         val = val + "2";
        //     }
        // }
        if(this.name && val != this.name){
            this.setName(val);
        }
        this.name = val;
    },
    "get_val" : function(){
        return this.name;
    }
});

var def_colors = [// "#ac725e",
    // "#d06b64",
    // "#f83a22",
    // "#fa573c",
    // "#ff7537",
    // "#ffad46",
    // "#42d692",
    // "#16a765",
    // "#7bd148",
    // "#b3dc6c",
    // "#fbe983",
    // "#fad165",
    // "#92e1c0",
    // "#9fe1e7",
    // "#9fc6e7",
    // "#4986e7",
    // "#9a9cff",
    // "#b99aff",
    // "#c2c2c2",
    // "#cabdbf",
    // "#cca6ac",
    // "#f691b2",
    // "#cd74e6",
    // "#a47ae2"
    "#F7977A",
    "#F9AD81",
    "#FDC68A",
    "#FFF79A",
    "#C4DF9B",
    "#A2D39C",
    "#82CA9D",
    "#7BCDC8",
    "#6ECFF6",
    "#7EA7D8",
    "#8493CA",
    "#8882BE",
    "#A187BE",
    "#BC8DBF",
    "#F49AC2",
    "#F6989D"
];
exports.def_colors = function(){
    return def_colors;
};

attributes.add({
    "name" : "color",
    "default" : function(){
        var r = Math.floor(Math.random()*def_colors.length);
        return def_colors[r];
    },
    "validate" : function(val){
        if(!val){
            return false;
        } else {
            if(val == "none" || val == ""){
                return false;
            }
            var rgb_fmt = val.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
            var html_fmt = val.match(/^#?[0-9a-f]{6}/i);
            if(!rgb_fmt && !html_fmt)
                return "Not a valid color";
            else
                return false;
        }
    },
    "apply" : function(val, fromDisk){
        if(fromDisk){
            val = val || "none";
            this.color = val;
            return;
        }
        if(val == "none" || val == ""){
            this.setColor(null);
            return;
        }
        if(!val){
            val = Math.floor(Math.random()*16777216).toString(16);
            if(val.length < 6){
                val = "0".repeat(6 - val.length) + val;
            }
            val = "#" + val;
        }
        this.setColor(val);
    },
    "get_val" : function(){
        return this.color;
    }
});

attributes.add({
    "name" : "deletable",
    "default" : true,
    "get_val" : function(){
        return this.deletable;
    },
    "apply" : function(val){
        this.deletable = val;
    }
});


attributes.add({
    "name" : "cookies_policy",
    "default" : true,
    "apply" : function(val){
        if(val && val != "deny"){
            this.cookies_policy = "all";
        } else {
            this.cookies_policy = "deny";
        }
    },
    "get_val" : function(){
        return this.cookies_policy == "all";
    }
});

attributes.add({
    "name" : "third_party_policy",
    "default" : "all",
    "apply" : function(val){
        this.third_party_policy = val;
    },
    "get_val" : function(){
        return this["third_party_policy"];
    }
});

attributes.add({
    "name" : "keep_until",
    "default" : "expire",
    "apply" : function(val){
        this.cookie_duration = val;
    },
    "get_val" : function(){
        return this.cookie_duration;
    }
});

attributes.add({
    "name" : "policy",
    "default" : [],
    "apply" : function(val, fromDisk){
        if(fromDisk){
            this.policy = val;
            return;
        }
        this.setPolicy(val);
    },
    "get_val" : function(){
        return this.policy;
    },
    "validate" : function(val){
        var ans = false;
        try {
            policy.set_policy(this, val, false);
        } catch(e){
            ans = "Cannot parse";
            console.warn("Cannot parse", e.toString());
        }
        return ans;
    }
});

attributes.add({
    "name" : "share_policy",
    "default" : "all",
    "apply" : function(val){
        this.share_policy = val;
    },
    "get_val" : function(){
        return this.share_policy;
    }
});

attributes.add({
    "name" : "allow_tracking",
    "default" : false,
    "apply" : function(val){
        this.allow_tracking = val;
        if(val){
            this.third_party_policy = "all";
            this.cookie_duration = "expire";
            this.share_policy = "none";
        } else {
            this.third_party_policy = "all";
            this.cookie_duration = "expire";
            this.share_policy = "all";
        }
    },
    "get_val" : function(){
        return this.allow_tracking;
    }
});

exports.apply = attributes.apply;
exports.validate = attributes.validate;
exports.prepopulate = attributes.prepopulate;
exports.default_vals = attributes.default_vals;
exports.list = attributes.list;
