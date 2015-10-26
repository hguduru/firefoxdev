var purpose = null;
var persona_attrs = [];
var original = {};
var cpicker;
var can_submit = true;
var cur_host = "";
var named_locations = {};

var cb_id = 0;
var ctx_id = -1;

var rule_id = 0;
var rules = {};

var cat_man = new CategoryManager();

var display_name_map = {
    "category": "Category: ",
    "host" : "Domain name: ",
    "day" : "Times: ",
    "location" : "Location: "
};

var info_text_map = {
    "category": "Matches the topic of the website",
    "host" : "Matches semicolon delimited top level domains. ",
    "day" : "Matches the day and time that you visit a website. ",
    "location" : "Matches based on your location when you visit a website. "
}

var display_order = [
    "host", "category", "location", "day"
];

function cat_display_name(acat){
    return acat.replace("_", " ", "g");
}

function cat_value(acat){
    return acat.replace(" ", "_", "g");
}

var get_prop_map = {
    "category" : function(div){
        var first = div.find("span.right-side").find(".category-select-top").val();
        var second = div.find("span.right-side").find(".category-select-sec").val();
        if(first == "--"){
            return false;
        }
        return [first, second == "--" ? "_default" : second];
    },
    "location" : function(div){
        var ans = div.find("span.right-side > select").val();
        return ans;
    },
    "day" : function(div, rule_obj) {
        return rule_obj.scheduler.getValue();
    },
    "host" : function(div){
        var ans_text = div.find("span.right-side > input").val();
        var ans = ans_text.split(";").map(function(ahost){
            return ahost.trim();
        });
        return ans;
    }
};

function lab_val(label, value, value2){
    var ans = $("<div>");
    ans.append($("<span>", {
        "class" : "rule-column-left"
    }).append($("<label>", {
        "text" : label
    })));
    var sp = $("<span>", {
        "class" : "right-side no-right"
    });
    sp.append(typeof value == "string" ? $("<input>", {
        "value" : value,
        "class" : "right-side-inputs"
    }).focus() : value.addClass("right-side-inputs"));
    ans.append(sp);
    return ans;
}

var prop_map = {
    "category" : function(cat_name){
        var all_categories = cat_man.heirarchy();
        if(cat_name !== "default"){
            var cat_one = $("<select>", {
                "class" : "category-select category-select-top"
            });
            cat_one.append($("<option>", {
                "value" : "--",
                "text" : "Category",
                "class" : "hidden"
            }));
            for(var cat in all_categories){
                cat_one.append($("<option>", {
                    "value" : cat,
                    "text" : cat_display_name(cat)
                }));
            }
            var cat_two = $("<select>", {
                "class" : "category-select category-select-sec"
            });
            cat_one.change(function(){
                cat_two.empty();
                cat_two.append($("<option>", {
                    "value" : "--",
                    "text" : "Subcategory",
                    "class" : "hidden"
                }));
                cat_two.append($("<option>", {
                    "text" : "All subcategories",
                    "value" : "_default"
                }));
                if(cat_one.val() && cat_one.val() != "--"){
                    all_categories[cat_one.val()].forEach(function(cat){
                        cat_two.append($("<option>", {
                            "value" : cat,
                            "text" : cat_display_name(cat)
                        }));
                    });
                    cat_two.val("_default");
                } else {
                    cat_two.val("--");
                }
            });
            if(cat_name){
                cat_one.val(cat_name[0]);
                cat_one.change();
                if(cat_name.length >= 2){
                    cat_two.val(cat_name[1]);
                }
            } else {
                cat_one.val("--");
                cat_one.change();
            }
            var tn = document.createTextNode("/");
            return lab_val("Category: ", $("<span>", {
                "class" : "category-span"
            }).append(cat_one, $(tn), cat_two));
        }
    },
    "host" : function(host_name){
        if(host_name != "default"){
            if(Array.isArray(host_name)){
                host_name = host_name.join(";");
            }
            return lab_val("Domain: ", host_name || "");
        }
    },
    "location" : function(loc_id){
        if(loc_id in named_locations || loc_id === null){
            var sel_loc = $("<select>", {
                "class" : "location-select"
            });
            for(var key in named_locations){
                sel_loc.append($("<option>", {
                    "value" : named_locations[key].id,
                    "text" : named_locations[key].name
                }));
            }
            if(Object.keys(named_locations).length == 0){
                sel_loc.append($("<option>", {
                    "value" : -1,
                    "text" : "Current location (unnamed)"
                }));
            }
            if(loc_id)
                sel_loc.val(loc_id);
            return lab_val("Location: ", sel_loc);
        }
    },
    "day" : function(day_val, rule_obj){
        if(day_val != "default"){
            var container = $("<span>", {
                "class" : "right-side"
            });
            var sch = new Scheduler(container);
            container.on("sized", fit_size);
            sch.setValue(day_val || []);
            sch.show();
            rule_obj.add_scheduler(sch);
            return lab_val(display_name_map["day"], container);
        }
    }
};

function Rule(){
    var elem = $("<span>", {
        "class" : "rule-div indent right-side"
    });

    var info = make_info_bubble(
        "A rule is satisfied if all conditions are satisfied.", {
            "orientation" : "right"
        })
            .addClass("no-right right-side space-bottom")
            .css("display", "inline-block");
    this.elems = {};
    this.root = elem;
    this.container = $("<div>", {
        "class" : "attribute-container"
    });
    this.id = rule_id++;
    rules[this.id] = this;
    this.rule_num = Object.keys(rules).length;
    var this_obj = this;
    this.container.append($("<div>", {
        "class" : "left-side rule-label"
    }).append($("<div>", {
        "text" : "Rule "+this.rule_num+": ",
        "class" : "rule-label-text"
    }), info, $("<div>", {
        "class" : "remove-rule-btn"
    }).append($("<button>", {
        "text" : "Remove rule"
    }).click(function(){
        this_obj.remove();
    }))), elem);
    $("#ctx-rules").append(this.container);
};

Rule.prototype.getValue = function(){
    var ans = {};
    for(var k in get_prop_map){
        if(k in this.elems){
            var val = get_prop_map[k](this.elems[k], this);
            if(val)
                ans[k] = val;
        }
    }
    return ans;
};

Rule.prototype.decr_rule_num = function(){
    this.rule_num -= 1;
    this.container.find(".rule-label > .rule-label-text").text("Rule "+this.rule_num+": ");
};

Rule.prototype.remove = function(){
    delete rules[this.id];
    this.container.remove();
    for(var r in rules){
        if(r > this.id){
            rules[r].decr_rule_num();
        }
    }
    fit_size(true);
};

Rule.prototype.add_prop = function(key, elem){
    if(!elem){
        var val = null;
        if(key == "host"){
            val = cur_host;
        }
        elem = prop_map[key](val, this);
    }
    elem.addClass("attribute-div");

    this.elems[key] = elem;
    var this_obj = this;
    var minus_btn = $("<i>", {
        "class" : "fa fa-minus-square icon-btn"
    }).click(function(){
        this_obj.remove_key(key);
        fit_size(true);
    });
    var info = make_info_bubble(info_text_map[key]).addClass("right-side force-visible");
    elem.children(".right-side").prepend(minus_btn, info);
    if(this.root.find(".add-attr-icons").length){
        this.root.find(".add-attr-icons").before(elem);
    } else {
        this.root.append(elem);
    }
    this.make_add_attr();
    fit_size(true);
};

Rule.prototype.add_scheduler = function(sch){
    this.scheduler = sch;
};

Rule.prototype.remove_key = function(name){
    this.elems[name].remove();
    delete this.elems[name];
    if(Object.keys(this.elems).length == 0){
        this.remove();
    }
    this.make_add_attr();
    fit_size(true);
};

Rule.prototype.make_add_attr = function(){
    var sel;
    var this_obj = this;
    if(Object.keys(this.elems).length == Object.keys(get_prop_map).length){
        this.root.find(".add-attr-icons").remove();
        return;
    } else if(this.root.find(".add-attr-icons").length == 0) {
        sel = $("<select>");
        this.root.append($("<div>", {
            "class" : "add-attr-icons"
        }).append(
            $("<span>", {
                "class" : "right-side no-right"
            }).append(sel)));
        sel.change(function(){
            var add_attr = this_obj.root.find(".add-attr-icons");
            var select_real = add_attr.find("select");
            this_obj.add_prop(select_real.val());
        });
    } else {
        var add_attr = this.root.find(".add-attr-icons");
        // remove all attributes so they can be added at the end of this method
        sel = add_attr.find("select");
        sel.children().remove();
    }
    display_order.filter(function(k){
        return !(k in this_obj.elems);
    }).forEach(function(e){
        sel.append($("<option>", {
            "value" : e,
            "text" : display_name_map[e]
        }));
    });
    sel.append($("<option>", {
        "class" : "hidden",
        "value" : "default-opt",
        "text" : "Choose condition..."
    }));
    sel.val("default-opt");
};

function add_rule(rule){
    var rule_obj = new Rule();
    rule.forEach(function(e){
        var prop_name;
        var prop_val;
        if(Array.isArray(e)){
            prop_val = e.map(function(a){
                return a.value;
            });
            prop_name = e[0].name;
        } else {
            prop_val = e.value;
            prop_name = e.name;
        }
        var add = prop_map[prop_name](prop_val, rule_obj);
        if(add){
            rule_obj.add_prop(prop_name, add);
        }
    });
}

var set_val_map = {
    "name" : "#ctx-input-name",
    "color" : function(val){
        $("#ctx-input-color").simplecolorpicker("selectColor", val || "none");
    },
    "policy" : function(val){
        $("#ctx-rules").empty();
        rules = [];
        if(Array.isArray(val)){
            val.forEach(function(r){
                var arule = add_rule(r);
            });
        }
    },
    "third_party_policy" : "#ctx-input-third",
    "keep_until" : "#ctx-input-duration",
    "cookies_policy" : function(value){
        $("#ctx-input-cookie_policy")
            .prop("checked", value)
            .change();
    },
    "share_policy" : "#ctx-input-share",
    "allow_tracking" : function(value){
        return $("#ctx-input-tracking")
            .prop("checked", value)
            .change();
    }
};

var value_map = {
    "name" : "#ctx-input-name",
    "color" : function(){
        var color = $("#ctx-input-color").val();
        return color != "none" ? color : false;
    },
    "policy" : function(){
        var ans = [];
        for(var k in rules){
            var val = rules[k].getValue();
            if(Object.keys(val) != 0)
                ans.push(val);
        }
        return ans;
    },
    "third_party_policy" : "#ctx-input-third",
    "keep_until" : "#ctx-input-duration",
    "cookies_policy" : function(){
        return $("#ctx-input-cookie_policy").is(":checked");
    },
    "share_policy" : "#ctx-input-share",
    "allow_tracking" : function(){
        return $("#ctx-input-tracking").is(":checked");
    }
};

var error_map = {
    "name" : "#ctx-input-name",
    "color" : "#ctx-input-color",
    "policy" : "#ctx-input-policy",
    "third_party_policy" : "#ctx-input-third",
    "keep_until" : "#ctx-input-duration",
    "share_policy" : "#ctx-input-share",
    "cookies_policy" : "#ctx-input-cookie_policy"
};

function set_value(attr, value){
    if(attr in set_val_map){
        if(typeof set_val_map[attr] === "function"){
            set_val_map[attr](value);
        } else {
            $(set_val_map[attr]).val(value);
        }
    } else {
        original[attr] = value;
    }
}

function get_value(attr){
    if(attr in value_map){
        if(typeof value_map[attr] === "function"){
            return value_map[attr]();
        } else {
            return $(value_map[attr]).val();
        }
    } else {
        return original[attr];
    }
}

function submit_fun(event){
    event.preventDefault();
    if(!can_submit)
        return;
    var ans = {
        "purpose" : purpose,
        "id" : ctx_id,
        "switch_to" : $("#switch-to-this").is(":checked")
    };
    if(cb_id !== null)
        ans["cb_id"] = cb_id;
    persona_attrs.forEach(function(attr){
        ans[attr] = get_value(attr);
    });
    can_submit = false;
    self.port.emit( "new-context", ans );
}

function set_cookie_policy_ui(){
    if(get_value("cookies_policy")){
        if($("#ctx-input-tracking").is(":checked")) {
            set_value("third_party_policy", "all");
            set_value("keep_until", "expire");
            set_value("share_policy", "none");
            $("#ctx-input-third").prop("disabled", true);
            $("#ctx-input-duration").prop("disabled", true);
            $("#ctx-input-share").prop("disabled", true);
        } else {
            $("#ctx-input-third").prop("disabled", false);
            $("#ctx-input-duration").prop("disabled", false);
            $("#ctx-input-share").prop("disabled", false);
        }
    } else {
        set_value("third_party_policy", "deny");
        set_value("keep_until", "expire");
        set_value("share_policy", "none");
        $("#ctx-input-third").prop("disabled", true);
        $("#ctx-input-duration").prop("disabled", true);
        $("#ctx-input-share").prop("disabled", true);
    }
}

$(function(){
    $("#create-context").click( submit_fun );
    $("#discard-changes").click(function(evnt){
        self.port.emit("hide-me");
        evnt.preventDefault();
    });
    $("#show-advanced > a").click(function(event){
        $("#advanced-section").removeClass("hidden");
        $("#show-advanced").addClass("hidden");
        fit_size();
    });
    $("#hide-advanced").click(function(event){
        $("#advanced-section").addClass("hidden");
        $("#show-advanced").removeClass("hidden");
        fit_size();
    });
    $("#context-form").submit(submit_fun);
    $("#context-form")[0].addEventListener('keyup', function(event){
        event.preventDefault();
        if(event.keyCode == 13){
            submit_fun(event);
        }
    });
    $("#rule-help").tooltip();
    $("#ctx-input-cookie_policy").change(set_cookie_policy_ui);
    $("#ctx-input-tracking").change(set_cookie_policy_ui);
    var showing_more = false;
    $("#ctx-add-rule").click(function(evnt){
        var r = new Rule();
        r.make_add_attr();
        evnt.preventDefault();
        fit_size(true);
    });

    $("#delete-ctx-btn").click(function(evnt){
        self.port.emit("delete-ctx", ctx_id);
    });
});

var in_error = {};

function remove_error(ui){
    $(error_map[ui])
        .tooltip("destroy")
        .css("border-color", "");
    delete in_error[ui];
}

function apply_error(ui, text){
    var real_ui = $(error_map[ui]);
    real_ui.attr("title", text)
        .tooltip()
        .tooltip("open")
        .animate({
            borderBottomColor : "red",
            borderTopColor : "red",
            borderLeftColor : "red",
            borderRightColor : "red"
        }, 200);
    in_error[ui] = true;
    real_ui.one("change", function(){
        remove_error(ui);
    });
}

function error(description){
    can_submit = true;
    for(var key in in_error){
        remove_error(key);
    }
    description.forEach(function(e){
        apply_error(e.name, e.text);
    });
}
self.port.on("error", error);

self.port.on("show", function(opts) {
    can_submit = true;
    error([]);
    $("#ctx-input-name").select();
    $("#advanced-section").addClass("hidden");
    $("body").addClass("overflow-hidden");
    $("#show-advanced").removeClass("hidden");
    if(opts.cb_id)
        cb_id = opts["cb_id"];
    else
        cb_id = null;
    if("id" in opts)
        ctx_id = opts["id"];
    else
        ctx_id = -1;
    purpose = opts["purpose"];
    cur_host = opts["cur_host"];

    if(opts.purpose == "new"){
        // addon_name_marker
        $("#purpose-title").text("Create new persona");
        // addon_name_marker
        $("#create-context").text("Create persona");
        $("#delete-ctx-btn").addClass("hidden");
    } else {
        // addon_name_marker
        $("#purpose-title").text("Modify persona");
        $("#create-context").text("Apply changes");
        if(opts.deletable === true){
            $("#delete-ctx-btn").removeClass("hidden");
        } else if(!opts.deletable){
            $("#delete-ctx-btn").addClass("hidden");
        }
    }
    persona_attrs.forEach(function(name){
        set_value(name, opts[name]);
    });
    $("#switch-to-this").prop("checked", opts.switch_to);
    fit_size(true);
});

function add_location(loc){
    named_locations[loc.id] = loc;
    $(".location-select > option[value=\"-1\"]").remove();
    $(".location-select").append($("<option>", {
        "value" : loc.id,
        "text" : loc.name
    }));
}

self.port.on("init-dialog", function(attrs, def_colors, locations){
    persona_attrs = attrs;
    for(var id in locations){
        add_location(locations[id]);
    }
    for(var i = 0; i < def_colors.length; i++){
        $("#ctx-input-color").append($("<option>", {
            "value" : def_colors[i],
            "text" : def_colors[i]
        }));
    }
    $("#ctx-input-color").simplecolorpicker({
        picker: true
    });
    var change_cur_color = function(){
        if($("#switch-to-this").is(":checked") &&
           purpose == "new"){
            self.port.emit("change-tab-color", get_value("color"));
        } else {
            self.port.emit("revert-tab-color");
        }
    };
    $("#ctx-input-color").change(change_cur_color);
    $("#switch-to-this").change(change_cur_color);
});

self.port.on("added-location", add_location);

self.port.on("deleted-location", function(loc){
    delete named_locations[loc.id];
    $(".location-select > option[value=\""+loc.id+"\"]").remove();
});

self.port.on("renamed-location", function(loc){
    named_locations[loc.id].name = loc.name;
    $(".location-select > option[value=\""+loc.id+"\"]").text(loc.name);
});
