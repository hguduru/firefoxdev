// logger.js - logs web traffic using sqlite backend for use in a study
var storage = require("./storage.js");
var my_tabs = require("./my_tabs.js");
var timers = require("sdk/timers.js");
var tabs = require("sdk/tabs");
var self = require("sdk/self");
var data = self.data;
var utils = require("./utils.js");
var persona_choser = require("./persona_choser.js").choser();
var persona_manager = require("./persona_manager.js").manager();
var locations = require("./locations.js");
var performance = require("./performance.js");
var main = require("./main.js");
var events = require("sdk/system/events");
var { Cc, Ci, Cu } = require("chrome");
const {Blob, File} = Cu.import("resource://gre/modules/Services.jsm", {});

var do_logging = true;
var screenshots = true;
var log_db = null;

var ins_req = null;
var ins_third = null;
var ins_cookie = null;
var last_rowid = null;
var update_title = null;
var add_location_req = null;
var add_persona_data_query = null;

var loc_watcher_id = -1;

var next_uid = 0;

var clear_log_on_shutdown = false;
var tab_uid = 1;

function LoggerHistroyBackend(){};

LoggerHistroyBackend.prototype.get = function(startDate, maxResults, callback){
    var before = startDate;
    var limit = maxResults;
    var reqs = [];
    try {
        var get_reqs_statement = log_db.createStatement("SELECT * FROM logging_first_party2 WHERE timestamp < :before ORDER BY timestamp DESC LIMIT :limit");
        get_reqs_statement.params.before = before;
        get_reqs_statement.params.limit = limit;
        while(get_reqs_statement.step()){
            reqs.push({
                uid : get_reqs_statement.row.uid,
                url : get_reqs_statement.row.url,
                time : get_reqs_statement.row.timestamp,
                persona : persona_manager.getPersona(get_reqs_statement.row.persona_id).name
            });
        }
    } catch(e) {
        console.warn("SQL logging error", e, log_db.lastError, log_db.lastErrorString);
    } finally {
        get_reqs_statement.finalize();
    }
    if(callback){
        callback(reqs);
        return [];
    } else {
        return reqs;
    }
};

LoggerHistroyBackend.prototype.getAll = function(callback){
    var log_data = {};
    log_data["first_party"] = [];
    var get_reqs_statement = log_db.createStatement("SELECT * FROM logging_first_party2");
    get_reqs_statement.execute();
    while(get_reqs_statement.step()){
        row = get_reqs_statement.row;
        let uid = row.uid;
        let url = row.url;
        let time = row.timestamp;
        let has_cookie = row.has_cookie;
        let lat = row.lat;
        let lng = row.lng;
        let img = row.thumbnail;
        let title = row.title;
        let persona_id = row.persona_id;
        let how_loaded = row.how_loaded;
        log_data.first_party.push({
            "uid" : uid,
            "url" : url,
            "timestamp" : time,
            "has_cookie" : has_cookie,
            "lat" : lat,
            "lng" : lng,
            "thumbnail" : img,
            "title" : title,
            "persona_id" : persona_id,
            "how_loaded" : how_loaded
        });
    }
    var get_third = log_db.createStatement("SELECT * FROM logging_third_party2");
    log_data.third_party = [];
    get_third.execute();
    while(get_third.step()){
        var row = get_third.row;
        let uid = row.uid;
        let url = row.url;
        let has_cookie = row.has_cookie;
        log_data.third_party.push({
            "uid" : uid,
            "url" : url,
            "has_cookie" : has_cookie
        });
    }

    var get_persona_config = log_db.createStatement("SELECT * FROM persona_config");
    log_data.persona_config_log = [];
    get_persona_config.execute();
    while(get_persona_config.step()){
        let row = get_persona_config.row;
        log_data.persona_config_log.push({
            "timestamp" : row.timestamp,
            "data" : row.data,
            "uid" : row.uid
        });
    }
    if(callback){
        callback(log_data);
        return [];
    } else {
        return log_data;
    }
};

LoggerHistroyBackend.prototype.removeItems = function(uids, callback){
    var del_state = log_db.createStatement(
        "DELETE FROM logging_first_party2 WHERE uid = :uid");
    add_persona_config({
        "type" : "deletion",
        "num" : uids.length
    });
    uids.forEach(function(uid){
        del_state.params.uid = uid;
        try {
            del_state.execute();
        } catch(e){
            console.warn("Sql error", e, log_db.lastError, log_db.lastErrorString);
        } finally {
            del_state.reset();
        }
    });
    del_state.finalize();
    callback();
};

LoggerHistroyBackend.prototype.clearLog = function(callback){
    do_clear_log();
    callback();
};

exports.LoggerHistroyBackend = LoggerHistroyBackend;

function log_visit(url, personaid, tldoc_or_uid, has_cookie, title, tab){
    if(!do_logging)
        return -1;
    var ans = 0;
    if(tldoc_or_uid === true){
        if(!ins_req){
            ins_req = log_db.createStatement("INSERT INTO logging_first_party2 (uid, url, has_cookie, persona_id, timestamp, title, lat, lng, how_loaded) VALUES (:uid, :url, :has_cookie, :persona_id, :now, :title, :lat, :lng, :how_loaded)");
        }
        var loc = locations.get_coords();
        ins_req.params.lat = loc ? loc.latitude : null;
        ins_req.params.lng = loc ? loc.longitude : null;
        ins_req.params.title = title;
        ins_req.params.url = url;
        ins_req.params.has_cookie = has_cookie ? 1 : 0;
        ins_req.params.persona_id = personaid;
        ins_req.params.now = Date.now();
        ins_req.params.uid = next_uid;
        var how = my_tabs.get_tab_key(tab, "per_reason");
        var reason_arg = how ? how.toString() : "";
        var the_tab_uid = get_tab_uid();
        ins_req.params.how_loaded = how + ";" + the_tab_uid;

        ins_req.executeAsync();
        ans = next_uid;
        next_uid += 1;
        performance.checkpoint("exit_log_visit_fp");
    } else {
        timers.setTimeout(function(){
            if(!ins_third)
                ins_third = log_db.createStatement("INSERT INTO logging_third_party2 (uid, url, has_cookie) VALUES (:uid, :url, :has_cookie)");
            ins_third.params.uid = tldoc_or_uid;
            ins_third.params.url = url;
            ins_third.params.has_cookie = has_cookie ? 1 : 0;
            ins_third.executeAsync();
        }, 10);

    }
    performance.checkpoint("exit_log_visit", tab);
    return ans;
}

var update_uri = null;

exports.redirect = function(theTab, new_url){
    if(!do_logging)
        return;
    performance.checkpoint("enter_redirect");
    var uid = my_tabs.get_tab_key(theTab, "uid", false);
    if(uid !== false){
        if(!update_title)
            update_title = log_db.createStatement("UPDATE logging_first_party2 SET url = :url WHERE uid = :uid");
        update_title.params.url = new_url;
        update_title.params.uid = uid;
        update_title.executeAsync();
    }
    performance.checkpoint("exit_redirect");
};

function log_after_load(win, uid){
    console.log("log after load");
    if(!do_logging || !screenshots)
        return;
    performance.checkpoint("enter_log_after_load", tab);
    try {
        var tab = utils.xul_tab_for_win(win);
        if(uid !== false){
            if(!update_uri)
                update_uri = log_db.createStatement("UPDATE logging_first_party2 SET title = :title, thumbnail = :thumb WHERE uid = :uid");
            var thumbnail = win.document.createElement("canvas");
            thumbnail.width = Math.ceil(win.screen.availWidth / 5.75);
            var aspectRatio = 0.5625; // 16:9
            thumbnail.height = Math.round(thumbnail.width * aspectRatio);
            var thumbnail_txt = "";
            if(typeof(thumbnail.getContext) === "function"){
                var ctx = thumbnail.getContext("2d");
                var snippetWidth = win.innerWidth * .6;
                var scale = thumbnail.width / snippetWidth;
                ctx.scale(scale, scale);
                ctx.drawWindow(win, win.scrollX, win.scrollY, snippetWidth, snippetWidth * aspectRatio, "rgb(255,255,255)");
                thumbnail_txt = thumbnail.toDataURL("image/png");
            }
            update_uri.params.title = win.document.title.toString();
            update_uri.params.thumb = thumbnail_txt;
            update_uri.params.uid = uid;
            update_uri.executeAsync();
        }
    } catch(e){}
    performance.checkpoint("exit_log_after_load", tab);
}
function wait_for_load(win, uid){
    if(!do_logging || win.top != win)
        return;

    console.log("log after load 1");
    if(win.document.readyState == "complete"){
        console.log("log after load ready");
        timers.setTimeout(function(){
            log_after_load(win, uid);
        }, 3000);
    } else {
        console.log("log after load listener");
        win.addEventListener("load", function(){
            console.log("log after load listener trigger");
            log_after_load(win, uid);
        });
        timers.setTimeout(function(){
            console.log("log after load timeout");
            log_after_load(win, uid);
        }, 3000);
    }
}

exports.log_request = function(load_initial, uri, has_cookie, win){
    if(!do_logging)
        return;
    if(!(uri.scheme == "http" || uri.scheme == "https")){
        return;
    }
    uri = uri.spec;
    if(!win || win.top != win){
        return;
    }
    var tab = utils.xul_tab_for_win(win);
    if(!tab || !utils.should_save_data(win)){
        return;
    }

    var topleveldoc = load_initial;
    var uid = my_tabs.get_tab_key(tab, "uid");
    if(topleveldoc === false){
        topleveldoc = uid;
    }
    var apersona = persona_choser.currentPersona(tab);
    if(apersona === null){
        return;
    }
    performance.checkpoint("enter_log_request", tab);

    if(topleveldoc === true){
        uid = log_visit(uri, apersona, topleveldoc, has_cookie, win.document.title.toString(), tab);
        my_tabs.set_tab_key(tab, "uid", uid);
        wait_for_load(win, uid);
    } else {
        log_visit(uri, apersona, topleveldoc, has_cookie, win.document.title.toString(), tab);
    }
    performance.checkpoint("exit_log_request", tab);
};

exports.log_cookie = function(url, win){
    if(!do_logging)
        return;
    var tab = utils.xul_tab_for_win(win);
    if(!tab || !utils.should_save_data(win)){
        return;
    }
    performance.checkpoint("enter_log_cookie", tab);
    var uid = my_tabs.get_tab_key(tab, "uid");
    if(uid !== null){
        if(!ins_cookie){
            ins_cookie = log_db.createStatement("UPDATE logging_first_party2 SET has_cookie = 1 WHERE uid = :uid");
        }
        ins_cookie.params.uid = uid;
        ins_cookie.executeAsync();
    }
    performance.checkpoint("exit_log_cookie", tab);
};

const Request = require("sdk/request").Request;

function get_tab_uid(tab){
    var the_tab_uid = my_tabs.get_tab_key(tab, "tab_marker");
    if(!the_tab_uid){
        the_tab_uid = (the_tab_uid = tab_uid++);
        my_tabs.set_tab_key(tab, "tab_marker", the_tab_uid);
    }
    return the_tab_uid;
}

function add_persona_config(data, tab){
    tab = tab || my_tabs.active_tab();
    if(!add_persona_data_query)
        add_persona_data_query = log_db.createStatement("INSERT INTO persona_config (timestamp, data) VALUES (:now, :data)");
    add_persona_data_query.params.now = Date.now();
    data["tabuid"] = get_tab_uid(tab);
    add_persona_data_query.params.data = JSON.stringify(data);
    add_persona_data_query.executeAsync();
};

exports.add_persona_config = add_persona_config;

var study_server_url = utils.study_server_url;

// var my_ip = "";

// function get_ip(){
//     return my_ip;
// }
// exports.ip = get_ip;

// var get_ip = function(callback){
//     var ipapi = "http://ifconfig.me";
//     Request({
//         url: ipapi,
//         onComplete : function(resp){
//             callback(resp.text.trim());
//         }
//     }).get();
// };

function get_new_study_uid(cb){
    return null;
    var match = my_tabs.active_url().toString();
    storage.save_json("install_url", match);
    Request({
        url : study_server_url("/questions/subjid/"),
        onComplete : function(resp){
            if(!resp.json){
                cb({
                    "error" : resp.text
                });
            } else if("subjid" in resp.json){
                cb(resp.json);
            } else {
                cb({
                    "error" : resp.text
                });
            }
        }
    }).get();
}

function do_checkin (uid){
    try {
        uid = uid || storage.read_json("study_uid", null).subjid;
        Request({
            url : study_server_url("/questions/addon_checkin/"+uid),
            onComplete : function(resp){
                var good = false;
                try{
                    var resp_obj = JSON.parse(resp.text);
                    if (resp_obj.good){
                        good = true;
                    }
                } catch(e){}
                if(good){
                    // console.log("good uid");
                } else {
                    // console.error({
                    //     "baduid" : uid,
                    //     "text" : resp.text
                    // });
                }
            }
        }).get();
    } catch(e){
        console.error({
            "badcheckin" : e.toString()
        });
    }
}

exports.do_checkin = do_checkin;

function set_study_uid(uid){
    storage.save_json("study_uid", {"subjid" : uid});
    do_checkin(uid);
}

exports.set_study_uid = set_study_uid;

function add_location_found(coords){
    // get_ip(function(curip){
    //     if(!add_location_req){
    //         add_location_req = log_db.createStatement("INSERT INTO logging_location (timestamp, lat, lng, ip) VALUES (:now, :lat, :lng, :ip)");
    //     }
    //     add_location_req.params.lat = coords ? coords.latitude : null;
    //     add_location_req.params.lng = coords ? coords.longitude : null;
    //     add_location_req.params.now = Date.now();
    //     add_location_req.params.ip = curip;
    //     add_location_req.executeAsync();
    // });
}

function cookie_event_listener(info){
    var type = info.type;
    var subject = info.subject;
    var data = info.data;
    if(data != "cleared" && data != "deleted" && data != "reload"){
        return;
    }
    var log_obj = {
        "type" : "cookie-op",
        "cookie-event" : data
    };
    if(data == "deleted" && subject){
        var got_hosts = false;
        try {
            var array = subject.QueryInterface(Ci.nsIArray);
            var enumerator = array.enumerate();
            var hosts = [];
            while(enumerator.hasMoreElements()){
                try{
                    var cookie = enumerator
                            .getNext()
                            .QueryInterface(Ci.nsICookie);
                    hosts.push(cookie.host.toString());
                } catch(e){}
            }
            log_obj["hosts"] = hosts;
            got_hosts = true;
        } catch(e){}
        if(!got_hosts){
            try {
                var cookie = subject.QueryInterface(Ci.nsICookie);
                log_obj["hosts"] = subject.host.toString();
            } catch(e){}
        }
    }
    add_persona_config(log_obj);
}

exports.on_load = function(logging){
    do_logging = logging;

    log_db = storage.get_db("privbrowse_addon_logging3.sqlite");
    try {
        log_db.executeSimpleSQL("CREATE TABLE IF NOT EXISTS logging_first_party2 (uid INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT, has_cookie INTEGER, persona_id INTEGER, timestamp INTEGER, lat REAL, lng, REAL, title TEXT, thumbnail TEXT, how_loaded TEXT)");
        log_db.executeSimpleSQL("CREATE TABLE IF NOT EXISTS logging_third_party2 (uid INTEGER REFERENCES logging_first_party2(uid) ON DELETE CASCADE, url TEXT, has_cookie INTEGER)");

        log_db.executeSimpleSQL("CREATE TABLE IF NOT EXISTS logging_location (uid INTEGER PRIMARY KEY AUTOINCREMENT, lat REAL, lng REAL, timestamp INTEGER, ip TEXT)");
        log_db.executeSimpleSQL("CREATE TABLE IF NOT EXISTS persona_config (uid INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT, timestamp INTEGER)");
        add_location_found(locations.get_coords());
        loc_watcher_id = locations.watch_coords(add_location_found);
    } catch(e){
        console.warn("sql logging error", e.toString(), log_db.lastError, log_db.lastErrorString);
    }
    var max_uid_st = log_db.createStatement("SELECT MAX(uid) as max FROM logging_first_party2");
    while(max_uid_st.step()){
        next_uid = max_uid_st.row.max + 1;
    }
    events.on("cookie-changed", cookie_event_listener, false);
};

exports.on_unload = function(should_delete_data){
    if(clear_log_on_shutdown)
        do_clear_log();
    if(ins_req)
        ins_req.finalize();
    if(ins_third)
        ins_third.finalize();
    if(last_rowid)
        last_rowid.finalize();
    if(update_uri)
        update_uri.finalize();
    if(update_title)
        update_title.finalize();
    if(ins_cookie)
        ins_cookie.finalize();
    if(add_location_req)
        add_location_req.finalize();
    if(add_persona_data_query)
        add_persona_data_query.finalize();
    locations.unwatch(loc_watcher_id);

    var max_uid_st = log_db.createStatement("SELECT MAX(uid) as max FROM logging_first_party2");
    if(max_uid_st > 4000) {
        log_db.executeSimpleSQL("DELETE FROM logging_first_party2"
                                + " ORDER BY uid ASC LIMIT " +
                                (4000 - max_uid_st));
    }
    var delete_old = log_db.createStatement(
        "DELETE FROM logging_first_party2 WHERE timestamp <= :time"
    );
    var two_weeks_ago = Date.now() - (1000 * 60 * 60 * 24 * 14);
    delete_old.params.time = two_weeks_ago;
    delete_old.execute(delete_old);
    delete_old.finalize();

    var delete_old_config = log_db.createStatement(
        "DELETE FROM persona_config  WHERE timestamp <= :time"
    );
    delete_old_config.params.time = two_weeks_ago;
    delete_old_config.execute(delete_old_config);
    delete_old_config.finalize();

    log_db.asyncClose({
        "complete" : function(){
            if(should_delete_data){
                storage.delete_file("privbrowse_addon_logging3.sqlite");
            }
        }
    });
    events.off("cookie-changed", cookie_event_listener);
};

function clear_log(){
    clear_log_on_shutdown = true;
}

function do_clear_log(){
    log_db.executeSimpleSQL("DROP TABLE IF EXISTS logging_first_party2;");
    log_db.executeSimpleSQL("DROP TABLE IF EXISTS logging_third_party2;");
    log_db.executeSimpleSQL("DROP TABLE IF EXISTS logging_location;");
    log_db.executeSimpleSQL("DROP TABLE IF EXISTS persona_config;");
    storage.delete_file("privbrowse_addon_logging3.sqlite");
}
