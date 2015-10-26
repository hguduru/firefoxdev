// bug-reporter.js - automated bug submission service
var { Cc, Ci, Cu } = require("chrome");
const {Blob, File} = Cu.import("resource://gre/modules/Services.jsm",
                               {});
var system = require("sdk/system");

var utils = require("./utils.js");
var storage = require("./storage.js");
var debug = require("debugger.js");

function do_debug_log(desc, config_info, cb){
    var bug_reporter_url = utils.study_server_url("/bugreport/");
    var errors = debug.dump();

    var console_svc = Cc["@mozilla.org/consoleservice;1"]
            .getService(Ci.nsIConsoleService);

    var all_messages = console_svc.getMessageArray();
    var interesting_messages = [];
    for(var i = 0; i < all_messages.length; i++){
        var mess = all_messages[i];
        try {
            var screrr = mess.QueryInterface(Ci.nsIScriptError);
            if(screrr.toString().match(/privatebrowse/gi) &&
               (screrr.flags & screrr.exceptionFlag) != 0){
                interesting_messages.push(screrr.toString());
            }
        } catch(e){}
    }

    var bug_message = {
        "description" : desc,
        "options" : ( config_info ? storage.all_data([
            "alexa-local-cache"
        ]) : ""),
        "log" : interesting_messages,
        "addonversion" : self.version.toString(),
        "ffversion" : system.version.toString(),
        "platform" : system.platform.toString()
    };

    var req = new XMLHttpRequest();
    req.open("POST", bug_reporter_url, true);
    req.onreadystatechange = function(){
        if(req.readyState == 4){
            if(cb)
                cb(req);
        }
    };

    var formData = Cc["@mozilla.org/files/formdata;1"]
            .createInstance(Ci.nsIDOMFormData);
    var oblob = Blob([JSON.stringify(bug_message)],
                     {type : "application/json"});
    formData.append("log_data", oblob, "log_file.json");
    req.send(formData);
}
exports.do_debug_log = do_debug_log;
