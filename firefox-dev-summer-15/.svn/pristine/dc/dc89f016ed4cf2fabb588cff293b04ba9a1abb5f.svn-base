// performance.js - performance testing library
var tabs = require("sdk/tabs");
var data = require("sdk/self").data;
var timers = require("sdk/timers");
var system = require("sdk/system");
var my_tabs = require("./my_tabs.js");
var logger = require("./logger.js");

var timeout = 15000;
var num_tabs = 10;

var urls = [];
var is_testing = false;
var begin_times = {};

// var perf_timer = Cc["@mozilla.org/files/formdata;1"]
//             .createInstance(Ci.nsIDOMPerformance);

function checkpoint(name){
    if(!is_testing)
        return;
    var main_win = my_tabs.active_window();
    console.log("checkpoint", name, main_win.performance.now());
}
exports.checkpoint = checkpoint;

function open_more_tabs(i, tab){
    if(i < urls.length){
        begin_times[urls[i]] = Date.now();
        if(tabs.length < num_tabs){
            tabs.open(urls[i]);
            tab = tabs.activeTab;
        } else {
            tab.url = urls[i];
        }
        tab.value_index = i;
        return true;
    } else {
        console.log("done");
        return false;
    }
}

exports.seed_log = function(log_size){
    for(var i = 0; i < log_size; i++) {
        logger.log_visit("www.google.com", 0, true, true, "fake page",
                         my_tabs.active_tab());
    }
};

exports.run_perf = function(parallel, log_size){
    urls = JSON.parse(data.load("performance_urls.json"));
    is_testing = true;
    if(!parallel){
        num_tabs = 1;
    }

    if(log_size) {
        exports.seed_log(log_size);
    }

    var before = Date.now();
    var i = 0;
    // var tab = tabs.activeTab;
    var continue_loading = function(tab){
        console.log("more tabs", i);
        var the_url = urls[tab.value_index];
        console.log("perf_debug", the_url, tab.value_index, begin_times[the_url]);
        var diff_time = Date.now() - begin_times[the_url];
        console.log("timing", the_url, diff_time > timeout ? "timeout" : diff_time);
        if(tab.time_out_id){
            var time_out_id = tab.time_out_id;
            timers.clearTimeout(time_out_id);
        }
        // timers.setTimeout(function(){
        tab.time_out_id = timers.setTimeout(function(){
            continue_loading(tab);
        }, timeout);
        if(!open_more_tabs(i++, tab)){
            timers.setTimeout(function(){
                system.exit();
            }, 5000);
        }
        // }, 1);
    };
    tabs.on("load", continue_loading);

    for(var j = 0; j < num_tabs; j++ ){
        open_more_tabs(i++, tabs.activeTab);
        tabs.activeTab.time_out_id = timers.setTimeout(function(){
            continue_loading(tabs.activeTab);
        }, timeout);
    }
};
