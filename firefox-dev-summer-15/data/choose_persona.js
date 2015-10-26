var added = 0;
var default_selected_flag = false;

var options_get = {};
var prev_options_get = {};

var cat_man = new CategoryManager();

var per_man = new PersonaManager();

var timer = new TimerCountDown(15);

function set_label_color(node, color){
    node.css("background", color);
}

function on_add(aPersona){
    var name_real = aPersona.name;
    var name = aPersona.id;
    var new_item = $("<input>", {
        name : "persona-radio",
        type : "radio",
        id : "persona-" + name,
        value : name,
        "class" : "persona-radio-cls"
    });
    var new_label = $("<label>", {
        "text" : name_real,
        "for" : "persona-" + name
    });
    set_label_color(new_label, aPersona.color);
    var to_add = [new_item, new_label, $("<br>")];
    var adder = null;
    added += 1;
    to_add = $("<div>").append(to_add);
    to_add.addClass("persona_block");
    if(added <= hidden_personas){
        if(added % 2 == 1){
            adder = $("#personas-left");
        } else {
            adder = $("#personas-right");
        }
    } else {
        if(added % 2 == 1){
            adder = $("#overflow-left");
        } else {
            adder = $("#overflow-right");
        }
        $("#show-more").removeClass("hidden");
    }
    adder.append(to_add);
    fit_size(true);
}

per_man.events.on("add", on_add);

per_man.events.on("remove", function (aPersona){
    var persona_list = per_man.get_personas();
    $("#persona-"+aPersona.id).parent().remove();
    if(added <= hidden_personas){
        $("#show-more").addClass("hidden");
        $("#overflow").addClass("hidden");
    }
    added -= 1;
    fit_size(false);
});

function on_change(aPersona){
    var id = aPersona.id;
    var lab_node = $("label[for='persona-"+id+"']");
    lab_node.text(aPersona.name);
    set_label_color($("label[for='persona-"+id+"']"), aPersona.color);
};

per_man.events.on("change", on_change);

var extract_opt = {
    "host" : function(){
        return options_get["host"];
    },
    "category" : function(){
        return options_get["category"];
    }
};

var hidden_personas = 6;

function submit_persona(name){
    self.port.emit("hide-me");
    if($("#switch-radio").is(":checked")){
        if($("#make-new-persona").prop("checked")){
            self.port.emit("use-new-persona", options_get.host, true, {
                "migrate" : $("#migrate-cookies").is(":checked")
            });
        } else {
            self.port.emit("change-persona", parseInt(name), true, {
                "migrate" : $("#migrate-cookies").is(":checked")
            });
        }
    } else {
        if($("#stay-this-time").is(":checked")){
            var opts = {};

            if($("#always-use-for-cb").is(":checked")){
                var rem_opt = $("input[name=remember-opts-r]:checked");
                var is_category = rem_opt.hasClass("category-option");
                var key, value;
                if(is_category){
                    key = "category";
                    var cat_ind = parseInt(rem_opt.attr("data-item"));
                    if(!isNaN(cat_ind)){
                        value = options_get.category[cat_ind];
                        for(var i = 0; i < value.length; i++){
                            if(value[i] == "Other"){
                                value[i] = "_default";
                            }
                        }
                    } else {
                        value = undefined;
                    }
                } else if($("#remember-input-host").is(":checked") || 
                          $("#remember-input-host-full").is(":checked")){
                    key = "host";
                    value = $("#remember-input-host").is(":checked") ? 
                        options_get.host : options_get.host_full;
                } else if($("#remember-precedence-rb").is(":checked")){
                    key = "conflict";
                    value = true;
                }
                opts[key] = value;
            }

            if(Object.keys(opts).length != 0){
                self.port.emit("change-persona", per_man.current_persona().id, false, opts);
            } else {
                self.port.emit("stay-this-time", options_get.host, per_man.current_persona().id);
            }
        }
    }
}

function handle_cats(){
    var categories = options_get.category;
    var has_cat = false;
    $("#remember-div-category").empty();
    for(var i = 0; i < categories.length; i++){
        var category = categories[i];
        if(category.length && category[0].length && category[0] != "Other"){
            var text = category[0];
            var cat_query = category;
            if(category[1] != "Other"){
                text += "/"+category[1];
            } else {
                cat_query = category.slice(0,1);
            }
            text = text.replace("_", " ", "g");
            var examples_text = "This category includes: ";
            text = "Category: " + text;
            var examples = cat_man.get_examples(cat_query);
            examples_text += examples.join(", ");

            var info_bubble = make_info_bubble(examples_text, {
                "div" : false
            }).addClass("space-left cat-popup");
            var to_add = $("<div>", {
            }).append($("<input>", {
                "type" : "radio",
                "class" : "remember-option category-option",
                "name" : "remember-opts-r",
                "id" : "remember-input-category-"+i,
                "data-item" : i
            })).append($("<label>", {
                "for" : "remember-input-category-"+i,
                "class" : "category-option-lab",
                "text" : text
            })).append(info_bubble);
            $("#remember-div-category").append(to_add);
            has_cat = true;
        }
    }
    if(has_cat){
        $("#remember-div-category").removeClass("hidden");
    } else {
        $("#remember-div-category").addClass("hidden");
    }
}

function stay_label(){
    var per_name = per_man.current_persona().name;
    var host = options_get.host;
    var full_host = options_get.host_full;
    $("#remember").text(host);
    if(host != full_host && full_host){
        $("#remember-full").text(full_host);
        $("#remember-full-div").removeClass("hidden");
    } else {
        $("#remember-full-div").addClass("hidden");
    }

    $("#always-use-for-text").html("Always use <b>" + per_name + "</b> for...");

    if($("#stay-this-time").is(":checked")){
        $("#remember-options").removeClass("hidden");
        $("#personas").addClass("hidden");
    } else if($("#switch-radio").is(":checked")){
        $("#personas").removeClass("hidden");
        $("#remember-options").addClass("hidden");
    }
}

function set_title(){
    var cur_per = per_man.current_persona();
    var conflict = options_get.conflict;
    var just_changed = options_get.ask_again;
    var conflict_persona_names;
    if(conflict){
        conflict = __unique(conflict);
        conflict_persona_names = conflict.map(function(pid){
            return per_man.get_persona(pid).name;
        });
        var conflict_list = "<b>"+conflict_persona_names[0]+"</b>";
        for(var i = 1; i < conflict_persona_names.length; i++){
            conflict_list += ", <b>"+conflict_persona_names[i]+"</b>";
        }
        $("#title").html("This website matches multiple personas: "+
                         conflict_list+". This page was loaded without " + 
                        "cookie or other identifiers to protect your privacy. ");
    } else if(just_changed){
        // addon_name_marker
        $("#title").html("You just changed to the <b>"
                         + cur_per.name +
                         "</b> persona. ");
    } else {
        // addon_name_marker
        $("#title").html("You are currently in the <b>"
                         + cur_per.name +
                         "</b> persona. ");
    }
    if(conflict || (prev_options_get.conflict &&
                    options_get.ask_again) ){
        $("#remember-precedence").removeClass("hidden");
    } else {
        $("#remember-precedence").addClass("hidden");
    }
    $("#always-use-for-cb").prop("checked", false).change();

    var aPersona = per_man.current_persona();
    $("#make-new-persona").prop("checked", true);
    $("#stay-this-time-lab").html("Stay in <b>"+aPersona.name+"</b>. ");
};

function populate(fields){
    var host = fields.host;
    var category = fields.category;
    var ask_again = fields.ask_again;
    var conflict = fields.conflict ? fields.conflict_personas : false;
    prev_options_get = options_get;
    options_get = {
        "host" : host,
        "category" : category,
        "ask_again" : ask_again,
        "switch_to" : fields.switch_to,
        "conflict" : conflict,
        "host_full" : fields.full_host,
        "soft_other" : fields.soft_other,
        "other_pids" : fields.other_pids
    };

    handle_cats();
    stay_label();
    set_title();

    if(fields.can_migrate && !ask_again){
        $("#migrate-area").removeClass("hidden");
    } else {
        $("#migrate-area").addClass("hidden");
    }
    $("#migrate-cookies").prop("checked", false);

    if(per_man.current_persona().id === 0 && default_selected_flag && !ask_again){
        $("#switch-radio").prop("checked", true).change();
    } else {
        $("#stay-this-time").prop("checked", true).change();
    }

    $("#overflow").addClass("hidden");
    if(added <= hidden_personas){
        $("#show-more").addClass("hidden");
    } else {
        $("#show-more").removeClass("hidden");
    }
    $("input[type=checkbox]").prop("checked", false).change();
    $("#remember-input-host").prop("checked", false).change();

    timer.restart();

    fit_size(false);
}

self.port.on("personas", populate);
self.port.on("default_selected", function(val){
    default_selected_flag = val;
});

function show_options(){
    stay_label();
    fit_size(true);
}

$(function(){
    $("#close-btn").click(function(){
        self.port.emit("hide-me");
    });

    $("#submitbutton").click(function(){
        submit_persona($("input[name=persona-radio]:checked").val());
    });

    $("#show-more").click(function(){
        $("#overflow").removeClass("hidden");
        $("#show-more").addClass("hidden");
        fit_size(true);
    });

    $("#switch-radio").change(show_options);
    $("#stay-radio").change(show_options);
    $("#stay-this-time").change(show_options);

    timer.attach($("#panel_area"));
    timer.events.on("timer-clear", function(){
        $("#timer-display").text("");
    });
    timer.events.on("done", function(){
        self.port.emit("hide-me");
    });
    timer.events.on("new-time", function(atime){
        $("#timer-display").text(atime);
    });

    $("#remember-options").addClass("hidden");
    $("#overflow").addClass("hidden");
    $("#show-more").addClass("hidden");

    $("#always-use-for-cb").change(function(e){
        if($(this).is(":checked")){
            $("#remember-input-host").prop("checked", true);
            $("input[name=\"remember-opts-r\"]").prop("disabled", false);
        } else {
            $("input[name=\"remember-opts-r\"]").prop("checked", false);
            $("input[name=\"remember-opts-r\"]").prop("disabled", true);
        }
    });
});
