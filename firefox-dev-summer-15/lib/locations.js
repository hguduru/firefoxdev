// locations.js - uses firefox location api to get Geographic data 
var Request = require("sdk/request").Request;
var storage = require("./storage.js");
var events = require("./event_manager.js").global_events;
var { Cc, Ci } = require("chrome");

var cur_location = null;
var cur_location_id = null;
var maximum_match_dist = 100;
var locs = {};
var use_location = true;
var watcher_id = -1;
var loc_watchers = {};
var loc_watcher_ids = 0;
var geo = null;
var id = 0;

function dist(from, to){
    var R = 6371; // km
    var dLat = ((to.latitude-from.latitude) * Math.PI)/180;
    var dLon = ((to.longitude-from.longitude) * Math.PI)/180;
    var lat1 = (from.latitude * Math.PI) / 180;
    var lat2 = (to.latitude * Math.PI) / 180;

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;
    return d * 1000;
}

function classify_cur_location(){
    var min_dist = Infinity;
    var min_dist_id = null;
    for(var loc_id in locs){
        var d = dist(cur_location, locs[loc_id].coords);
        if(d < min_dist){
            min_dist = d;
            min_dist_id = loc_id;
        }
    }
    if(min_dist_id !== null && min_dist < locs[min_dist_id].radius){
        cur_location_id = min_dist_id;
    } else {
        cur_location_id = null;
    }
    events.emit("named-location-changed", {
        subject : exports.get_location()
    });
}

function name_cur_location(name){
    if(cur_location == null){
        console.warn("Error trying to name current location without data");
        return null;
    } else {
        return name_location(cur_location, name);
    }
}

function generate_temp_name(cb, coords){
    if(!coords){
        coords = cur_location;
    }
    Request({
        url : "https://maps.googleapis.com/maps/api/geocode/json?latlng="+coords.latitude+","+coords.longitude+"&sensor=false",
        onComplete : function(resp){
            if(resp.status == 200 && resp.json.status == "OK"){
                var results = resp.json.results;
                if(results){
                    if(results.length){
                        var relevant_res = results[0];
                        var components = relevant_res.address_components;
                        var ans = "";
                        for(var i = 0; i < components.length; i++){
                            if(components[i].types.indexOf("street_number") != -1||
                               components[i].types.indexOf("route") != -1){
                                if(ans != "")
                                    ans += " ";
                                ans += components[i].short_name;
                            }
                        }
                        if(ans == ""){
                            ans = relevant_res.formatted_address;
                        }
                        cb(ans);
                        return;
                    }
                }
            }
            console.warn("Error generating name");
            cb("unnamed");
        }
    }).get();
}

exports.generate_name = generate_temp_name;

function name_location(coords, name){
    var the_location = { "coords" : coords, 
                         "name" : name, 
                         "id" : id++,
                         "radius" : 100 };
    locs[the_location.id] = the_location;
    classify_cur_location();
    events.emit("privbrowse-added-location", {
        subject : the_location 
    });
    return the_location.id;
}

function remove(id){
    if(!(id in locs))
        return;
    events.emit("privbrowse-location-delete", {
        subject : locs[id]
    });
    delete locs[id];
    classify_cur_location();
}
exports.remove = remove;

exports.rename = function(id, name){
    locs[id].name = name;
    events.emit("privbrowse-location-rename", {
        subject : locs[id]
    });
    if(id == cur_location_id){
        events.emit("named-location-changed", {
            subject : exports.get_location()
        });
    }
};
exports.change_radius = function(id, val){
    locs[id].radius = val;
};
exports.move = function(id, obj){
    locs[id].coords = obj;
    classify_cur_location();
};

function update_watchers(){
    for(var id in loc_watchers){
        loc_watchers[id](cur_location);
    }
}

function get_geoloc(){
    geo = Cc["@mozilla.org/geolocation;1"].createInstance(Ci.nsISupports);
    watcher_id = geo.watchPosition(function(pos){
        cur_location = {
            "latitude" : pos.coords.latitude, 
            "longitude" : pos.coords.longitude// , 
            // "accuracy" : pos.coords.accuracy
        };
        classify_cur_location();
        update_watchers();
    }, function(err){
        console.warn("geolocation error", err.message);
    }, {
        "timeout" : 30000,
        "enableHighAccuracy" : true,
        "maximumAge" : 300000
    });
}

exports.get_coords = function(){
    return cur_location;
};

exports.watch_coords = function(cb){
    var loc_wat = loc_watcher_ids++;
    loc_watchers[loc_wat] = cb;
};

exports.unwatch = function(id){
    delete loc_watchers[id];
    if(!use_location){
        stop_watching();
    }
};

exports.temp_on = function(){
    if(!use_location){
        get_geoloc();
    }
};

exports.get_location = function(){
    if(cur_location_id !== null){
        return locs[cur_location_id];
    } else {
        return null;
    }
};

exports.assign_name_to_loc = name_location;
exports.assign_name_to_cur_loc = name_cur_location;

exports.named_locations = function(){
    return locs;
};

exports.location_names = function(){
    return Object.keys(locs).map(function(k){
        return locs[k].name;
    });
};

function stop_watching(){
    if(watcher_id != -1)
        geo.clearWatch(watcher_id);
    watcher_id = -1;
}

exports.use_location = function(arg){
    if(arguments.length == 1){
        var prev = use_location;
        use_location = arg;
        if(!use_location){
            stop_watching();
            cur_location_id = null;
            cur_location = null;
        } else if(!prev){
            get_geoloc();
            update_watchers();
        }
        return use_location;
    } else {
        return use_location;
    }
};

exports.load = function(){
    var settings = storage.read_json("location_settings", function(){
        return {
            "use_location" : false,
            "locs" : {}
        };
    });
    locs = settings.locs || {};
    for(var loc in locs){
        if(!locs[loc].radius){
            locs[loc].radius = 100;
        }
    }
    use_location = "use_location" in settings ? settings.use_location : true;
    if(use_location)
        get_geoloc();
    id = Math.max(Math.max.apply(null, Object.keys(locs)), 0) + 1;
};

function save_data(){
    storage.save_json("location_settings", {"locs" : locs, 
                                            "use_location" : use_location });
}

exports.save_data = save_data;

exports.unload = function(){
    save_data();
    stop_watching();
};
