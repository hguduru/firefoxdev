// history-query.js - web history backend
var { Cc, Ci, Cu, Cr, components } = require("chrome");

var historyService = Cc["@mozilla.org/browser/nav-history-service;1"]
        .getService(Ci.nsINavHistoryService);

function WebHistoryBackend(){
    this.removedItems = {};
    this.uids = {};
    this.uid_token = 0;
};

WebHistoryBackend.prototype._filter = function(aRecord){
    return !(aRecord.uid in this.removedItems);
};

WebHistoryBackend.prototype._getUid = function(aRecord){
    if(aRecord.url in this.uids){
        if(aRecord.time in this.uids[aRecord.url]){
            return this.uids[aRecord.url][aRecord.time];
        } else {
            this.uids[aRecord.url][aRecord.time] = {};
        }
    } else {
        this.uids[aRecord.url] = {};
    }
    this.uid_token++;
    this.uids[aRecord.url][aRecord.time] = this.uid_token;
    return this.uid_token;
};

WebHistoryBackend.prototype.queryInfo = function(querySpec){
    if(Array.isArray(querySpec.host)){
        var thisobj = this;
        return querySpec.host.map(function(ahost){
            return thisobj.queryInfo({
                "host" : ahost
            });
        });
    } else {
        var options = historyService.getNewQueryOptions();

        // No query parameters will return everything
        var query = historyService.getNewQuery();

        var oneweek = 1000 * 60 * 60 * 24 * 7 * 1;
        var oneweekago = Date.now() - oneweek;

        options.resultType = Ci.nsINavHistoryQueryOptions.RESULTS_AS_VISIT;
        options.queryType = Ci.nsINavHistoryQueryOptions.QUERY_TYPE_HISTORY;

        query.domain = querySpec.host;
        query.beginTime = oneweekago * 1000;
        query.beginTimeReference = query.TIME_RELATIVE_EPOCH;

        // execute the query
        var result = historyService.executeQuery(query, options);
        var ans = this._interpretResults(result);


        var infoAnswer = {
            "host" : querySpec.host,
            "inlastweek" : ans.length
        };
        return infoAnswer;
    }
};

WebHistoryBackend.prototype._interpretResults = function(result){
    var ans = [];

    var cont = result.root;
    cont.containerOpen = true;

    for (var i = 0; i < cont.childCount; i ++) {

        var node = cont.getChild(i);

        // "node" attributes contains the information
        // (e.g. URI, title, time, icon...)
        // see : https://developer.mozilla.org/en/nsINavHistoryResultNode
        var record = {
            "url" : node.uri,
            "title" : node.title,

            // expects milliseconds, not microseconds
            "time" : node.time / 1000,
            "timestamp" : node.time / 1000,
            "has_cookie" : "notavailable",
            "lat" : "notavailable",
            "lng" : "notavailable",
            "thumbnail" : null,
            "persona_id" : 0,
            "how_loaded" : "notavailable",

            "accessCount" : node.accessCount
        };
        record.uid = this._getUid(record);
        if(this._filter(record)){
            ans.push(record);
        }
    }

    cont.containerOpen = false;
    ans.sort(function(a, b){
        return a.time < b.time;
    });
    return ans;
};

WebHistoryBackend.prototype.get = function(time, limit, callback, mintime){

    // No query options set will get all history, sorted in database order,
    // which is nsINavHistoryQueryOptions.SORT_BY_NONE.
    var options = historyService.getNewQueryOptions();

    // No query parameters will return everything
    var query = historyService.getNewQuery();

    options.resultType = Ci.nsINavHistoryQueryOptions.RESULTS_AS_VISIT;
    options.queryType = Ci.nsINavHistoryQueryOptions.QUERY_TYPE_HISTORY;
    if(limit){
        options.maxResults = limit;
    }
    if(mintime){
        query.beginTime = mintime * 1000;
        query.beginTimeReference = query.TIME_RELATIVE_EPOCH;
    }

    query.endTime = time * 1000 - 1;
    query.endTimeReference = query.TIME_RELATIVE_EPOCH;

    // execute the query
    var result = historyService.executeQuery(query, options);
    var realAns = this._interpretResults(result);
    if(callback){
        callback(realAns);
    }
};

WebHistoryBackend.prototype.removeItems = function(uids, callback){
    for(var i = 0; i < uids.length; i++) {
        this.removeItem(uids[i]);
    }
    callback();
};

WebHistoryBackend.prototype.removeItem = function(uid) {
    this.removedItems[uid] = 1;
};

WebHistoryBackend.prototype.getAll = function(callback){
    var twoweeks = 1000 * 60 * 60 * 24 * 7 * 2;
    var twoweeksago = Date.now() - twoweeks;
    this.get(Date.now(), null, function(ans){
        callback({
            "first_party" : ans,
            "third_party" : []
        });
    }, twoweeksago);
};

if(exports)
    exports.WebHistoryBackend = WebHistoryBackend;
