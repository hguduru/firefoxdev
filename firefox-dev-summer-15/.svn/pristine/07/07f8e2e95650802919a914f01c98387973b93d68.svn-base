// alexa-wrapper.js - manages querying of alexa data
var data = require("sdk/self").data;
var {XMLHttpRequest} = require("sdk/net/xhr");
var lru = require("lru");

var storage = require("./storage.js");
var utils = require("./utils.js");

var alexa_module = (function(){
    var cache = null;
    var cache_limit = 200;
    var num_querys_made = 0;

    var onload = function(){
        cache = new lru.LRUCache(cache_limit);
        var load_cache = storage.read_json("alexa-local-cache2", function(){
            return [];
        });
        if(load_cache){
            for(var i = 0; i < load_cache.length; i++){
                var value = load_cache[i].value.split(",");
                if(value.length % 2 == 0 && value.length >= 2){
                    var ans = [];
                    for(var j = 0; j < value.length; j+= 2){
                        ans.push(value.slice(j, j+2));
                    }
                    cache.put(load_cache[i].key, ans);
                }
            }
        }
    };

    var save_data = function(){
        storage.save_json("alexa-local-cache2", cache.toJSON());
    };

    const grey_serv =
              "http://privacy-study.ece.cmu.edu/privbrowse/web_survey/getcat/?host=";

    var make_request = function (query_url){
        if(query_url.indexOf(".") == -1){
            return [["Other", "Other"]];
        }
        var req = new XMLHttpRequest();
        var ans = [["Other", "Other"]];
        req.open("get", grey_serv+query_url, false);
        req.send();
        if(req.status == 200){
            var response = JSON.parse(req.responseText);
            if("Error" in response){
                console.warn("Alexa error", ans["Error"]);
            } else {
                if(response.categories){
                    if(response.categories.length > 0){
                        if(response.categories != "Error"){
                            ans = response.categories;
                            cache.put(query_url, ans);
                        } else {
                            console.warn("Alexa error", ans.categories);
                        }
                    } else {
                        cache.put(query_url, ans);
                    }
                } else {
                    console.warn("Alexa error", ans);
                }
            }
        } else {
            console.warn("Alexa not reachable, code:", req.status, grey_serv+query_url);
        }
        return ans;

    };

    var get_category = function(url){
        // Turning off alexa queries for performance
        return [["Other", "Other"]];
        var query_url = utils.normalize_host(url);
        var cache_resp = cache.get(query_url);
        var ans;
        if(cache_resp == undefined){
            ans = make_request(query_url);
        } else {
            ans = cache_resp;
        }
        return ans.filter(function(value, index, self){
            for(var j = 0; j < self.length; j++){
                // TODO: don't use to string for array equality
                if(self[j].toString() == value.toString()){
                    return j === index;
                }
            }
            return false;
        });
    };

    var all_categories = function(){
        return JSON.parse(data.load("cats_formatted.json"));
    };

    return {
        onload : onload,
        save_data : save_data,
        get_category : get_category,
        all_categories : all_categories
    };
})();
exports.alexa_module = alexa_module;
