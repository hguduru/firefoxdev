// log-history-frontend.js - front facing controller for web history logging
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var data = self.data;
let { getFavicon } = require("sdk/places/favicon");
var {XMLHttpRequest} = require("sdk/net/xhr");
var { Cc, Ci, Cu } = require("chrome");
const {Blob, File} = Cu.import("resource://gre/modules/Services.jsm", {});

var HistoryController = require("./history-controller.js")
        .HistoryController;
var HistoryView = require("./history-view.js").HistoryView;
var storage = require("./storage.js");
var utils = require("./utils.js");

var backendFactory;
var dev_version_enabled = false;

function onLoadTab(tab){
    var worker = tab.attach({
        contentScriptFile : [data.url("jquery/jquery-1.9.1.js"),
                             data.url("moment/moment.min.js"),
                             data.url("log_sanitize.js")]
    });

    var backend = backendFactory();
    var historyWorker = new HistoryController(backend);

    var dodump = function(uid){
        var finish_cb = function(submitted, response){
            if(submitted){
                var survey_url = utils.study_server_url("", true);
                if(response.url)
                    response['url'] = survey_url + response.url;
                worker.port.emit("send_log_resp", submitted, response);
                if(response.clear_data){
                    historyWorker.clearLog();
                }
            } else {
                worker.port.emit("send_log_resp",
                                 submitted, response.reason);
                console.warn("error sending log", response);
            }
        };
        var upload_progress_cb = function(upload_progress){
            worker.port.emit("upload-progress", upload_progress);
        };
        historyWorker.getResults(function(logdata){
            sendDataFn(logdata, uid, finish_cb, upload_progress_cb);
        });
    };

    var historyView = new HistoryView(historyWorker, {
        askFavicon : getFavicon,
        askDomain : function(url, answer){
            answer(utils.normalize_host(url));
        },
        dump : dodump
    });
    historyView.attach(worker.port);

}

function openLogViewing(event){
    tabs.open({
        url : data.url("log_sanitize.html"),
        onLoad : onLoadTab
    });
};
exports.openLogViewing = openLogViewing;

function sendDataFn(log_data, study_uid, cb, cb_upload){
    log_data["config"] = storage.all_data([
        "alexa-local-cache"
    ]);
    log_data["install_url"] = storage.read_json("install_url", []);
    log_data["study_uid"] = study_uid;
    var submit_data_url = utils.study_server_url("/uploader/index.json");
    var req = new XMLHttpRequest();
    req.open("POST", submit_data_url, true);
    req.onreadystatechange = function(){
        if(this.readyState == 4){
            if(this.status == 200){
                var resp_val = JSON.parse(this.responseText);
                cb(resp_val.submitted, resp_val);
                return;
            } else {
                cb(false, {"reason" :
                           "The server could not be reached. Try again later. "
                          });
                console.warn("Error submitting log", this.status, this.responseText);
            }
        }
    };
    req.upload.onprogress = function(evt){
        cb_upload((1.0 * evt.loaded) / (1.0*evt.total));
    };

    var formData = Cc["@mozilla.org/files/formdata;1"]
            .createInstance(Ci.nsIDOMFormData);
    var oblob = Blob([JSON.stringify(log_data)], {type : "application/json"});
    formData.append("survey", oblob, "log_file.json");
    formData.append("phase", "2");
    formData.append("uid", study_uid);
    if(dev_version_enabled){
        formData.append("dev", "1");
    }
    req.send(formData);
};

function enable_clear_log_f(){
    dev_version_enabled = true;
}

exports.enable_clear_log = enable_clear_log_f;

function get_study_uid(cb){
    var study_uid = storage.read_json("study_uid", null);
    if(study_uid === null){
        // get_new_study_uid(function(new_uid){
        //     storage.save_json("study_uid", new_uid);
        //     cb(new_uid);
        // });
        cb({"error" : "no study id"});
    } else {
        cb(study_uid);
    }
}

function onload(type){
    if(type == "logging") {
        var logger = require("./logger.js");
        backendFactory = function(){
            return new logger.LoggerHistroyBackend();
        };
    } else if (type == "webhistory"){
        var history_query = require("./history-query.js");
        backendFactory = function(){
            return new history_query.WebHistoryBackend();
        };
    } else {
        console.log("error bad type");
        onload("logging");
        return;
    }

    get_study_uid(function(auid){
        // intentionally blank; just make sure that we have a uid
        if("error" in auid){
            console.error("uid-error", auid.error);
        }
    });
}

exports.onload = onload;
