// history-controller.js - mediator between backend logging capabilities and
// front ends
function HistoryController(oracle){
    this.oracle = oracle;
};

HistoryController.prototype.init = function(stepsize, callback){
    this.stepsize = stepsize || 50;
    this.startTime = Date.now();
    this.timeStack = [];
    this._getResults(callback);
};

HistoryController.prototype.results = function(){
    return this.cachedResults;
};

HistoryController.prototype._useResults = function(callback){
    return (function(results){
        this.cachedResults = results;
        var num = this.cachedResults.length;
        if(num){
            this.endTime = this.cachedResults[num - 1].time;
        } else {
            this.endTime = this.startTime;
        }

        var setolder = function(){
            this.oracle.get(this.endTime, 1,
                            this._setOlder(callback));
        }.bind(this);
        if(this.timeStack.length){
            var prev_time = this.timeStack[this.timeStack.length - 1];
            this.oracle.get(prev_time, 1, this._setNewer(setolder));
        } else {
            this._hasNewer = false;
            setolder();
        }
    }).bind(this);
};

HistoryController.prototype._setNewer = function(callback){
    return (function(results){
        this._hasNewer = results.length != 0;
        callback();
    }).bind(this);
};

HistoryController.prototype._setOlder = function(callback){
    return (function(results){
        this._hasOlder = results.length != 0;
        callback(this);
    }).bind(this);
};

HistoryController.prototype._getResults = function(callback){
    this.cachedResults = this.oracle.get(this.startTime,
                                         this.stepsize,
                                         this._useResults(callback));
};

HistoryController.prototype.hasNewer = function(){
    return this._hasNewer;
};

HistoryController.prototype.hasOlder = function(){
    return this._hasOlder;
};

HistoryController.prototype.moveNewer = function(callback){
    this.startTime = this.timeStack.pop();
    this._getResults(callback);
};

HistoryController.prototype.moveOlder = function(callback){
    this.timeStack.push(this.startTime);
    this.startTime = this.endTime;
    this._getResults(callback);
};

HistoryController.prototype.getResults = function(callback){
    return this.oracle.getAll(callback);
};

HistoryController.prototype.removeItems = function(uids, callback){
    this.oracle.removeItems(uids, function(){
        this._getResults(callback);
    }.bind(this));
};

HistoryController.prototype.clearLog = function(callback){
    this.oracle.clearLog(function(){
        this._getResults(callback);
    }.bind(this));
};

if(typeof(exports) !== 'undefined')
    exports.HistoryController = HistoryController;
