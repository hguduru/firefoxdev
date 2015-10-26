var main = require("main.js");
var tabs = require("sdk/tabs");

exports["test main"] = function(assert) {
    assert.pass("Unit test running!");
};

function open_more_tabs(i, urls, begins, tab, assert){
    if(i < urls.length){
        begins[urls[i]] = Date.now();
        tab = tab ? tab : tabs.activeTab;
        tab.value_index = i;
        tab.url = urls[i];
    } else {
        assert("Done");
    }
}

exports["test perf"] = function(assert, done){
    var tab = tabs.activeTab;
    var urls = ["google.com", "cnn.com"];
    var begin_times = {};
    var before = Date.now();
    tabs.on("ready", function(tab){
        var the_url = urls[tab.value_index];
        console.log("timing", the_url, Date.now() - begin_times[the_url]);
        open_more_tabs(i++, urls, begin_times, tab, assert);
    });
    var i = 0;
    // open_more_tabs(i++, urls, begin_times, tabs.activeTab, assert);
    for(var tab_num = 0; tab_num < 10; tab_num++ ){
        begin_times[urls[i]] = Date.now();
        // tab.open(i++, urls, begin_times, null, assert);
        console.log("opening", urls[i]);
        tabs.open({ url : urls[i], inNewWindow : false });
        tabs.activeTab.value_index = i;
        i = i + 1;
    }
};

require("sdk/test").run(exports);
