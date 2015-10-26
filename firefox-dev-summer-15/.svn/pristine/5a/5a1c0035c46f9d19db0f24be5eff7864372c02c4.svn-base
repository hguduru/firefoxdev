// are-you-sure.js - shows an "are you sure to delete panel"
var panels = require("sdk/panel");
var data = require("sdk/self").data;

var mainPanel = null;

var persona_manager = require("./persona_manager.js").manager();

function show_are_you_sure(aPersona){
    if(!mainPanel){
        mainPanel = panels.Panel({
            contentURL : data.url("are-you-sure.html"),
            contentScriptFile : [
                data.url("jquery/jquery-1.9.1.js"),
                data.url("are-you-sure.js")],
            width : 400,
            height : 100
        });

        mainPanel.port.on("yes", function(id){
            persona_manager.deletePersona(id);
            mainPanel.hide();
        });

        mainPanel.port.on("no", function(){
            mainPanel.hide();
        });
    }
    mainPanel.show();
    mainPanel.port.emit("ask", aPersona.name, aPersona.id);
}

exports.show_are_you_sure = show_are_you_sure;
