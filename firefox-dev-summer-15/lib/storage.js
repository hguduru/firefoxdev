// storage.js - manages loading and unloading or saved settings
var { Cc, Ci, Cu, Cr, components } = require("chrome");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

var timers = require("sdk/timers");
var prefs = require("sdk/preferences/service");


var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
        createInstance(Ci.nsIScriptableUnicodeConverter);
converter.charset = "UTF-8";

var grand_file_out = {};

var main = require("./main.js");

exports.all_data = function(excluding){
    var ans = {};
    main.onSaveConfig();
    for(var k in grand_file_out){
        if(excluding.indexOf(k) == -1)
            ans[k] = grand_file_out[k];
    }
    return ans;
};

function file_location(fname){
    var file = Cc["@mozilla.org/file/directory_service;1"].
            getService(Ci.nsIProperties).
            get("ProfD", Ci.nsIFile);
    file.append(fname);
    return file;
}

function save_json(fname, obj, fun){
    var ostream = open_file_w(fname);
    write_to_file(ostream, JSON.stringify(obj, null, 4), function(){
        close_safe_output(ostream);
        if(fun){
            fun();
        }
    } );
}

function read_json_non_blocking(fname, default_val, callback){
    var file  = file_location(fname);
    NetUtil.asyncFetch(file, function(inputStream, status) {
        if (!components.isSuccessCode(status)) {
            callback(default_val());
            return;
        }
        // The file data is contained within inputStream.
        // You can read it into a string with

        var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
        var ans = new Object(JSON.parse(data));
        callback(ans);
    });
}

function read_json(fname, default_val){
    var file = file_location(fname);
    var ans;
    if( file.exists() ){
        var data = "";
        var fstream = Cc["@mozilla.org/network/file-input-stream;1"].
                createInstance(Ci.nsIFileInputStream);
        var cstream = Cc["@mozilla.org/intl/converter-input-stream;1"].
                createInstance(Ci.nsIConverterInputStream);
        fstream.init(file, -1, 0, 0);
        cstream.init(fstream, "UTF-8", 0, 0);
        let (str = {}) {
            let read = 0;
            do {
                read = cstream.readString(0xffffffff, str);
                data += str.value;
            } while (read != 0);
        };
        cstream.close(); // this closes fstream
        ans = new Object(JSON.parse(data));
    } else {
        if(typeof default_val === "function"){
            ans = default_val();
        } else {
            ans = default_val;
        }

    }
    return ans;
}

var timer_ids = [];

function save_timer(fname, obj_callback){
    var timeout = prefs.get("browser.sessionstore.interval");
    if(!timeout)
        return;
    timer_ids.push(
        timers.setInterval(function(){
            save_json(fname, obj_callback());
        }, timeout)
    );
}

function stop_timers(){
    timer_ids.forEach(function(id){
        timers.clearInterval(id);
    });
}

function open_file_w(fname){
    var file = file_location(fname);
    var ostream = FileUtils.openSafeFileOutputStream(file);
    return ostream;
}

function write_to_file(ostream, line, callback){
    var istream = converter.convertToInputStream(line);
    NetUtil.asyncCopy(istream, ostream, function(status) {
        if (!components.isSuccessCode(status)) {
            // Handle error!
            console.error("error writing file", status);
            return;
        }
        // Data has been written to the file.
        if(callback)
            callback();
    });
}

function close_safe_output(ostream){
    FileUtils.closeSafeFileOutputStream(ostream);
}

exports.load = function(callback){
    var p = Date.now();
    read_json_non_blocking("privbrowse.json", function(){
        console.log("cant read grand file");
        return {};
    }, function (val){
        grand_file_out = val;
        if("private_browse_logging.json" in grand_file_out){
            delete grand_file_out["private_browse_logging.json"];
        }
        if("addon_prev_persona.json" in grand_file_out){
            delete grand_file_out["addon_prev_persona.json"];
        }
        callback();
    });
};

function delete_file(fname){
    var floc = file_location(fname);
    floc.remove(false);
}

exports.delete_file = delete_file;

exports.unload = function(should_delete_data){
    save_json("privbrowse.json", grand_file_out);
};

exports.log_file_read = read_json;

exports.read_json = function(name, def){
    if(name in grand_file_out){
        return grand_file_out[name];
    } else {
        return read_json(name, def);
    }
};

exports.save_json = function(name, val, force){
    grand_file_out[name] = val;
    if(force){
        timers.setTimeout(function(){
            save_json("privbrowse.json", grand_file_out);
        }, 10000);
    }
};

// exports.log_file_save = save_json;
exports.log_file_save = function(afile, data){
    var ostream = FileUtils.openSafeFileOutputStream(afile);
    write_to_file(ostream, JSON.stringify(data), function(){
        close_safe_output(ostream);
    });
};

exports.save_json_standalone = save_json;

// exports.save_timer = save_timer;
exports.stop_timers = stop_timers;

var dbService = Cc["@mozilla.org/storage/service;1"].
        getService(Ci.mozIStorageService);

exports.get_db = function(key, memory){
    var dbfile = file_location(key);
    var dbConn = null;
    if(!memory){
        dbConn = dbService.openDatabase(dbfile);
    } else {
        dbConn = dbService.openSpecialDatabase("memory");
    }

    return dbConn;
};

exports.del_migrate = function(key){
    delete grand_file_out[key];
};
