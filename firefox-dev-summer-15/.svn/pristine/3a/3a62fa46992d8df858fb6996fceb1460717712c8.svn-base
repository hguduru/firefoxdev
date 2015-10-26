var per_man = new PersonaManager();

function this_fit_size(animate){
    fit_size(animate, null, 10);
}

function do_action(name, arg){
    if(arg !== undefined){
        self.port.emit(name, arg);
    } else {
        self.port.emit(name);
    }
    self.port.emit("hide-me");
}

function persona_div_for(aPersona){
    return $("#persona-"+aPersona.id).children("div");
}

per_man.events.on("add", function(aPersona){
    $("#persona-items").append($("<li>", {
        "id" : "persona-"+aPersona.id
    }).append($("<div>", {
        "text" : aPersona.name,
        "class" : "navbar-item"
    }).click(function(){
        do_action("change-persona", aPersona.id);
    })));
    this_fit_size(true);
});

per_man.events.on("remove", function(aPersona){
    $("#persona-"+aPersona.id).remove();
    this_fit_size(true);
});

per_man.events.on("change", function(aPersona){
    persona_div_for(aPersona).text(aPersona.name);
    this_fit_size(true);
});

per_man.events.on("current", function(aPersona){
    $(".navbar-current-persona").removeClass("navbar-current-persona");
    persona_div_for(aPersona).addClass("navbar-current-persona");
});

self.port.on("show", function(){
    this_fit_size(false);
});

self.port.on("num-unconfigured", function(n){
    if(n){
        $("#grouping-page").text("Assign personas (" + n + ")...");
    } else {
        $("#grouping-page").text("Assign personas...");
    }
});

$(function(){
    $("#new-mode-btn").click(function(){
        do_action("new-mode");
    });
    $("#settings-btn").click(function(){
        do_action("settings");
    });
    $("#assign-btn").click(function(){
        do_action("assign");
    });
    $("#grouping-page").click(function(){
        do_action("grouping");
    });
    persona_div_for(per_man.current_persona())
        .addClass("navbar-current-persona");
});
