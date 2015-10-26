// restart_prompt.js - you must restart addon popup
var data = require("sdk/self").data;
var my_panel = require("./my_panel.js");
var my_tabs = require("./my_tabs.js");

exports.show = function(){
    return;
    var panel = new my_panel.XulPanel({
        "src" : data.url("restart-prompt.html"),
        "id" : "restart-prompt",
        "height" : 50
    });
    var tab = my_tabs.active_tab();
    panel.show(tab, 25);
};
